/**
 * retriever.ts — Recuperación por capas normativas
 *
 * Implementa una búsqueda en dos capas que respeta la jerarquía normativa
 * chilena: ley > reglamento > instruccion > resolucion > norma_tecnica > otro
 */

import { ChunkRecuperado } from "./rag";
import { PlanRecuperacion } from "./router";
import { rerankDocuments } from "./voyage";
import { embedConHyDE } from "./hyde";
import { recuperarMultiQuery } from "./multi-query";
import { getSupabaseServiceClient } from "./supabase";

// ─── Jerarquía normativa ──────────────────────────────────────────────────────

const ORDEN_JERARQUIA = [
  "ley",
  "reglamento",
  "instruccion",
  "resolucion",
  "norma_tecnica",
  "otro",
] as const;

function indiceJerarquia(jerarquia: string | null): number {
  if (!jerarquia) return ORDEN_JERARQUIA.length - 1; // "otro" por defecto
  const idx = ORDEN_JERARQUIA.indexOf(
    jerarquia as (typeof ORDEN_JERARQUIA)[number]
  );
  return idx === -1 ? ORDEN_JERARQUIA.length - 1 : idx;
}

// ─── Tipos de normas de alta jerarquía (Capa 1) ───────────────────────────────

// OJO: "Ley" y "LEY" son dos valores distintos para el filtro `tipo = ANY(...)`
// de match_chunks — la comparación es sensible a mayúsculas. 26 de las 27 leyes
// del corpus están guardadas como tipo="LEY" (todo mayúscula); solo 1 quedó
// como "Ley". Antes del 2026-07-26 esta lista solo traía "Ley", así que la
// capa de alta jerarquía excluía silenciosamente casi todas las leyes del
// corpus — incluida la Ley 19.300 completa. Se detectó al revisar por qué
// una pregunta sobre Ley 19.300 nunca traía sus propios artículos como fuente.
const TIPOS_ALTA_JERARQUIA = ["LGUC", "OGUC", "LEY", "Ley", "DFL", "DL"];

// ─── Parámetros de recuperación ──────────────────────────────────────────────

/** Chunks que se pasan al modelo (ventana de contexto final) */
// 18 chunks (~5940 tokens) + system prompt (~1200) + respuesta (~1500) = ~8640 total
// Compatible con DeepSeek/Gemini/Mistral/OpenRouter. Groq (5to fallback) puede fallar por TPM.
const MAX_CHUNKS = 18;

/** Candidatos pre-rerank (mayor diversidad → mejor reranking) */
const CANDIDATOS_RERANK = 50;

/**
 * Cupos minimos reservados en la ventana final para normas de rango legal o
 * reglamentario superior (LGUC, OGUC, LEY, DFL, DL).
 *
 * El rerank ordena solo por relevancia textual, asi que nada impedia que los
 * 18 chunks finales fueran circulares DDU -- que son el 44% del corpus y
 * repiten mucho vocabulario de formulario. Una respuesta de REVISOR ARQ que
 * cita solo circulares, sin la ley o el reglamento que las sustenta, es
 * jerarquicamente debil aunque sea textualmente relevante. Esta cuota se
 * aplica solo si hay candidatos de alta jerarquia disponibles: nunca rellena
 * con material irrelevante ni desplaza referencias exactas.
 */
const MIN_ALTA_JERARQUIA = 5;

// ─── Mapeo de resultados RPC → ChunkRecuperado ───────────────────────────────

function mapearChunk(r: Record<string, unknown>): ChunkRecuperado {
  return {
    id: r.id as string,
    texto: r.texto as string,
    similarity: r.similarity as number,
    norma_tipo: r.norma_tipo as string,
    norma_numero: r.norma_numero as string,
    norma_titulo: r.norma_titulo as string,
    articulo: (r.metadatos as Record<string, unknown>)?.articulo as
      | string
      | null,
    jerarquia: (r.metadatos as Record<string, unknown>)?.jerarquia as
      | string
      | null,
    url_fuente: r.fuente as string,
    fecha_vigencia_desde: r.fecha_vigencia_desde as string | null,
    norma_dominio: (r.norma_dominio as string | null) ?? null,
    norma_organo_emisor: (r.norma_organo_emisor as string | null) ?? null,
    norma_jerarquia_norm: (r.norma_jerarquia_norm as string | null) ?? null,
    norma_etapas_proyecto: Array.isArray(r.norma_etapas_proyecto)
      ? (r.norma_etapas_proyecto as string[])
      : [],
  };
}

// ─── Detección de consultas con términos exactos ─────────────────────────────

/**
 * Detecta si una consulta tiene términos exactos que se benefician de FTS:
 * - Referencias a artículos específicos ("Art. 116", "artículo 3°")
 * - Nombres de normas exactos ("DDU 541", "LGUC", "DS-47")
 * - Números de disposiciones
 *
 * Exportada para testing unitario.
 */
export function tieneTerminosExactos(pregunta: string): boolean {
  return (
    /art[íi]culo[s]?\s+\d+/i.test(pregunta) ||
    /\bart\.\s*\d+/i.test(pregunta) ||
    /\b(DDU|LGUC|OGUC|DS|DFL|DL|Ley|Circular|Resolución|Res|Decreto)\s*[-–]?\s*\d+/i.test(pregunta) ||
    /\bN[°º]\s*\d+/i.test(pregunta)
  );
}

// ─── Llamada al RPC match_chunks ─────────────────────────────────────────────

async function llamarMatchChunks(
  sb: ReturnType<typeof getSupabaseServiceClient>,
  embedding: number[],
  count: number,
  filterTipos: string[] | null,
  soloVigentes: boolean,
  preguntaTexto?: string  // si se pasa, intenta búsqueda híbrida
): Promise<ChunkRecuperado[]> {

  // Intentar búsqueda híbrida si hay términos exactos y se proporcionó texto
  if (preguntaTexto && tieneTerminosExactos(preguntaTexto)) {
    try {
      const { data: dataHybrid, error: errorHybrid } = await sb.rpc("match_chunks_hybrid", {
        query_embedding: embedding,
        query_text: preguntaTexto,
        match_count: count,
        filter_tipos: filterTipos,
        solo_vigentes: soloVigentes,
        vector_weight: 0.6, // más peso a FTS cuando hay artículos exactos
      });

      if (!errorHybrid && dataHybrid !== null && (dataHybrid as unknown[]).length > 0) {
        return (dataHybrid as Record<string, unknown>[]).map(mapearChunk);
      }
      // Caer al modo vector si la función híbrida no está disponible aún
    } catch {
      // función híbrida no existe todavía → fallback silencioso
    }
  }

  // Búsqueda vectorial estándar
  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: count,
    filter_tipos: filterTipos,
    solo_vigentes: soloVigentes,
  });

  if (error) throw new Error(`Error RPC match_chunks: ${error.message}`);
  if (data === null) {
    console.error("[retriever] match_chunks retornó null sin error — filterTipos:", filterTipos);
    return [];
  }
  if (!data.length) return [];

  return (data as Record<string, unknown>[]).map(mapearChunk);
}

// ─── Fallback BM25 (FTS puro) cuando Voyage AI no está disponible ─────────────

/**
 * Búsqueda full-text sobre la columna `texto` de chunks, sin embeddings.
 * Se activa como fallback cuando Voyage AI devuelve errores 4xx/5xx.
 * Usa el índice GIN ya presente en Supabase para `to_tsvector('spanish', texto)`.
 */
async function buscarPorFTS(
  sb: ReturnType<typeof getSupabaseServiceClient>,
  pregunta: string,
  count: number
): Promise<ChunkRecuperado[]> {
  try {
    // websearch permite frases entre comillas y operadores AND/OR naturales
    const { data, error } = await sb
      .from("chunks")
      .select("id, texto, metadatos, normas!inner(tipo, numero, titulo, jerarquia_norm, dominio, etapas_proyecto, url_fuente, organo_emisor, vigente)")
      .eq("normas.vigente", true)
      .textSearch("texto_tsv", pregunta, { type: "websearch", config: "spanish" })
      .limit(count);

    if (error || !data?.length) return [];

    return data.map((r: Record<string, unknown>) => {
      const norma = r.normas as Record<string, unknown> | null ?? {};
      const meta  = r.metadatos as Record<string, unknown> | null ?? {};
      return {
        id:                   r.id as string,
        texto:                r.texto as string,
        similarity:           0.5, // FTS no produce score normalizado
        norma_tipo:           (norma.tipo as string) ?? "",
        norma_numero:         (norma.numero as string) ?? "",
        norma_titulo:         (norma.titulo as string) ?? "",
        articulo:             (meta.articulo as string | null) ?? null,
        jerarquia:            (meta.jerarquia as string | null) ?? null,
        url_fuente:           (norma.url_fuente as string) ?? "",
        fecha_vigencia_desde: null,
        norma_dominio:        (norma.dominio as string | null) ?? null,
        norma_organo_emisor:  (norma.organo_emisor as string | null) ?? null,
        norma_jerarquia_norm: (norma.jerarquia_norm as string | null) ?? null,
        norma_etapas_proyecto: Array.isArray(norma.etapas_proyecto)
          ? (norma.etapas_proyecto as string[])
          : [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * When a question names both an article and a norm, retrieve exact evidence
 * directly instead of relying exclusively on semantic ranking.
 */
async function recuperarReferenciaExacta(
  sb: ReturnType<typeof getSupabaseServiceClient>,
  pregunta: string
): Promise<ChunkRecuperado[]> {
  const articulo = pregunta.match(/\b(?:art[íi]culo|art\.)\s*([\d.]+)\s*[°º]?/i)?.[1]?.replace(/\.+$/, "");
  // Dos formas de nombrar una norma en lenguaje natural:
  //  (a) tipo + numero:  "DS 47", "Ley N 19.300", "DL 824", "DDU 541"
  //  (b) solo sigla:     "OGUC", "LGUC" -- no llevan numero en el habla comun.
  // Hasta 2026-09 solo se reconocia (a) con tipos DS|LEY|DFL|DL, asi que el
  // caso mas frecuente de la app ("articulo 2.1.17 de la OGUC") nunca activaba
  // la recuperacion exacta y dependia por completo del ranking semantico.
  // OGUC y LGUC tienen exactamente una norma vigente cada una en el corpus
  // (OGUC=DS-47, LGUC=DFL-458), asi que filtrar solo por tipo es inequivoco.
  const porSigla = pregunta.match(/\b(OGUC|LGUC)\b/i);
  const porNumero = pregunta.match(/\b(DS|LEY|DFL|DL|DDU)\s*(?:N[\u00B0\u00BA]\s*)?[-\u2013]?\s*(\d+(?:\.\d+)*)/i);
  if (!articulo || (!porSigla && !porNumero)) return [];

  let consulta = sb
    .from("normas")
    .select("id, tipo, numero, titulo, url_fuente, jerarquia_norm, dominio, etapas_proyecto, organo_emisor")
    .eq("vigente", true);

  if (porSigla) {
    // La sigla manda: "articulo 2.1.17 de la OGUC (DS 47)" debe resolver a la
    // OGUC, no al decreto supremo 47 suelto.
    consulta = consulta.eq("tipo", porSigla[1].toUpperCase());
  } else {
    const tipo = porNumero![1].toUpperCase();
    const crudo = porNumero![2].replace(/\./g, "");
    // 8 circulares DDU estan guardadas con cero a la izquierda ("007"), asi
    // que "DDU 7" debe poder alcanzarlas.
    const variantes = Array.from(new Set([crudo, crudo.padStart(3, "0")]));
    consulta = consulta.eq("tipo", tipo).in("numero", variantes);
  }

  const { data: normas, error: normaError } = await consulta.limit(4);
  if (normaError || !normas?.length) return [];

  const resultado: ChunkRecuperado[] = [];
  for (const normaActual of normas) {
    const respuestaChunks = await sb
      .from("chunks")
      .select("id, texto, metadatos")
      .eq("norma_id", normaActual.id)
      .in("metadatos->>articulo", [articulo, articulo + "."])
      .limit(6);
    if (respuestaChunks.error) continue;
    const chunks = (respuestaChunks.data ?? []) as Array<{ id: string; texto: string; metadatos: unknown }>;
    for (const chunk of chunks) {
      const meta = (chunk.metadatos as Record<string, unknown>) ?? {};
      if (String(meta.articulo ?? "").replace(/\.+$/, "") !== articulo) continue;
      resultado.push({
        id: chunk.id as string, texto: chunk.texto as string, similarity: 1.1,
        referenciaExacta: true,
        norma_tipo: normaActual.tipo as string, norma_numero: normaActual.numero as string,
        norma_titulo: normaActual.titulo as string, articulo: (meta.articulo as string) ?? null,
        jerarquia: (meta.jerarquia as string) ?? null, url_fuente: normaActual.url_fuente as string,
        fecha_vigencia_desde: null, norma_dominio: (normaActual.dominio as string) ?? null,
        norma_organo_emisor: (normaActual.organo_emisor as string) ?? null,
        norma_jerarquia_norm: (normaActual.jerarquia_norm as string) ?? null,
        norma_etapas_proyecto: Array.isArray(normaActual.etapas_proyecto) ? normaActual.etapas_proyecto as string[] : [],
      });
    }
  }
  return resultado;
}

function esAltaJerarquia(chunk: ChunkRecuperado): boolean {
  const tipo = (chunk.norma_tipo ?? "").toUpperCase();
  return TIPOS_ALTA_JERARQUIA.some((t) => t.toUpperCase() === tipo);
}

/**
 * Elige `cupos` chunks de una lista ya ordenada por relevancia, garantizando
 * al menos `minAlta` de rango legal o reglamentario superior SI los hay.
 *
 * El rerank ordena por relevancia textual pura, asi que una consulta cuyo
 * vecindario semantico esta copado por circulares DDU podia terminar con los
 * 18 cupos llenos de circulares y sin la ley que las sustenta. Cuando falta
 * cuota, se promueven chunks de alta jerarquia que quedaron mas abajo y se
 * descartan los de menor relevancia que no son de alta jerarquia. El orden por
 * relevancia se conserva; si no hay candidatos de alta jerarquia, no se
 * rellena con nada.
 *
 * Exportada para testing unitario.
 */
export function seleccionarConCuota(
  ordenados: ChunkRecuperado[],
  cupos: number,
  minAlta: number
): ChunkRecuperado[] {
  if (ordenados.length <= cupos) return ordenados;

  const elegidos = new Set(ordenados.slice(0, cupos).map((c) => c.id));
  let altas = ordenados.slice(0, cupos).filter(esAltaJerarquia).length;

  for (const candidato of ordenados.slice(cupos)) {
    if (altas >= minAlta) break;
    if (!esAltaJerarquia(candidato)) continue;

    // Sacar el peor (mas abajo en el ranking) que no sea de alta jerarquia.
    let liberado = false;
    for (let i = ordenados.length - 1; i >= 0; i--) {
      const actual = ordenados[i];
      if (elegidos.has(actual.id) && !esAltaJerarquia(actual)) {
        elegidos.delete(actual.id);
        liberado = true;
        break;
      }
    }
    if (!liberado) break; // ya son todos de alta jerarquia

    elegidos.add(candidato.id);
    altas++;
  }

  return ordenados.filter((c) => elegidos.has(c.id));
}

function anteponerExactos(exactos: ChunkRecuperado[], resto: ChunkRecuperado[]): ChunkRecuperado[] {
  const ids = new Set(exactos.map((chunk) => chunk.id));
  return [...exactos, ...resto.filter((chunk) => !ids.has(chunk.id))].slice(0, MAX_CHUNKS);
}

// ─── Función principal exportada ─────────────────────────────────────────────

/**
 * Recupera chunks en dos capas respetando la jerarquía normativa chilena,
 * luego aplica reranking con voyage-rerank-2 para maximizar relevancia final.
 *
 * Pipeline:
 *   1. Capa 1 (alta jerarquía): LGUC, OGUC, Ley, DFL, DL
 *   2. Capa 2 (amplia): todos los tipos del plan
 *   3. Fusión y dedup (hasta CANDIDATOS_RERANK = 32)
 *   4. Rerank con voyage-rerank-2 (falla silencioso → fallback por similitud)
 *   5. Devolver top MAX_CHUNKS (16)
 *
 * Si Voyage AI falla en cualquier punto, activa fallback BM25 (FTS puro en Supabase).
 */
export async function recuperarPorCapas(
  pregunta: string,
  plan: PlanRecuperacion
): Promise<ChunkRecuperado[]> {
  // Instanciar cliente Supabase una sola vez para ambas capas
  const sb = getSupabaseServiceClient();
  const exactos = await recuperarReferenciaExacta(sb, pregunta);

  // Generar embedding HyDE: promedio de [query original] + [texto normativo hipotético]
  // Si Voyage AI está caído (401/503/timeout) → fallback BM25 puro.
  let embedding: number[];
  try {
    embedding = await embedConHyDE(pregunta, plan.dominiosActivos);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[retriever] Voyage AI no disponible — activando fallback BM25:", msg);
    // Fallback: búsqueda full-text sin embeddings. Calidad inferior pero funcional.
    return anteponerExactos(exactos, await buscarPorFTS(sb, pregunta, MAX_CHUNKS));
  }

  // Ampliar counts para tener más candidatos pre-rerank
  const countCapa1 = Math.max(plan.matchCountPorCapa[0] ?? 5, 15);
  const countCapa2 = Math.max(plan.matchCountPorCapa[1] ?? 8, 25);

  // ── Capa 1: normas de alta jerarquía ──────────────────────────────────────
  const capa1 = await llamarMatchChunks(
    sb,
    embedding,
    countCapa1,
    TIPOS_ALTA_JERARQUIA,
    plan.filtrarSoloVigentes,
    pregunta  // habilita búsqueda híbrida cuando hay artículos exactos
  );

  // ── Capa 2: todos los tipos del plan ─────────────────────────────────────
  const capa2 = await llamarMatchChunks(
    sb,
    embedding,
    countCapa2,
    plan.tiposNorma.length > 0 ? plan.tiposNorma : null,
    plan.filtrarSoloVigentes,
    pregunta
  );

  // ── Capa 3: multi-query RRF — variantes semánticas de la pregunta ─────────
  // Genera 3 reformulaciones de la query y fusiona los resultados con RRF.
  // Pasa el embedding ya computado para evitar una llamada Gemini HyDE duplicada.
  // Falla silencioso → devuelve [] si Gemini no está disponible.
  const capa3 = await recuperarMultiQuery(
    pregunta,
    20, // topK de la fusión RRF (se integra como candidatos adicionales)
    plan.tiposNorma.length > 0 ? plan.tiposNorma : null,
    plan.filtrarSoloVigentes,
    embedding  // reusar embedding HyDE ya computado → -1 llamada Gemini
  );

  // ── Fusión: capa 1 (jerarquía alta) → capa 2 (amplia) → capa 3 (multi-query)
  // Las referencias exactas entran siempre y primero: son evidencia pedida
  // explicitamente por la persona usuaria, no un resultado de ranking.
  const vistos = new Set<string>();
  const candidatos: ChunkRecuperado[] = [];
  const agregar = (chunk: ChunkRecuperado) => {
    if (vistos.has(chunk.id) || candidatos.length >= CANDIDATOS_RERANK) return;
    vistos.add(chunk.id);
    candidatos.push(chunk);
  };

  for (const chunk of exactos) agregar(chunk);

  // Reparto round-robin entre las tres capas en vez de concatenarlas.
  //
  // Antes se recorria [capa1, capa2, capa3] en orden y se cortaba al llegar al
  // tope: con 15 + 25 + 20 = 60 candidatos para 50 cupos, los 10 descartados
  // salian siempre de la capa 3 (multi-query), la que reformula la pregunta de
  // tres maneras para encontrar lo que la redaccion original no alcanza. Esa
  // capa entregaba dos tercios de lo que producia. El rerank reordena todo
  // igual, asi que lo unico que importa es QUE candidatos entran, no en que
  // orden; turnandose, las tres capas quedan representadas.
  const capas = [capa1, capa2, capa3];
  const indices = capas.map(() => 0);
  let quedanCapas = true;
  while (quedanCapas && candidatos.length < CANDIDATOS_RERANK) {
    quedanCapas = false;
    for (let c = 0; c < capas.length; c++) {
      const capa = capas[c];
      if (indices[c] >= capa.length) continue;
      agregar(capa[indices[c]]);
      indices[c]++;
      quedanCapas = true;
      if (candidatos.length >= CANDIDATOS_RERANK) break;
    }
  }

  if (candidatos.length === 0) return exactos;

  // ── Reranking con voyage-rerank-2 ─────────────────────────────────────────
  // Falla silencioso: si rerank no está disponible (cuota, timeout),
  // se cae al fallback de ordenamiento por jerarquía + similitud.
  try {
    const documentos = candidatos.map((c) => c.texto);
    // Sin top_k: el rerank cobra por tokens de entrada, no por resultados
    // devueltos, asi que pedir el orden completo no cuesta mas y permite
    // aplicar la cuota de jerarquia sobre todo el pool en vez de sobre un
    // recorte ya hecho.
    const resultados = await rerankDocuments(pregunta, documentos);

    // Reconstruir array en el orden devuelto por rerank
    const rerankeados = resultados.map((r) => ({
      ...candidatos[r.index],
      // Sobrescribir similarity con el rerank score para que el UI
      // muestre la relevancia real (0-1 normalizado). `rerankeado` le avisa a
      // calcularConfianza() que esta leyendo la escala del rerank y no la del
      // coseno, que viven en rangos distintos.
      similarity: Math.round(r.relevanceScore * 1000) / 1000,
      rerankeado: true,
    }));

    const conCuota = seleccionarConCuota(rerankeados, MAX_CHUNKS, MIN_ALTA_JERARQUIA);
    return anteponerExactos(exactos, conCuota);
  } catch (err) {
    console.warn("[retriever] Rerank Voyage fallido — ordenando por jerarquía:", err instanceof Error ? err.message : err);
    // Fallback: ordenar por jerarquía + similarity original
    candidatos.sort((a, b) => {
      const jA = indiceJerarquia(a.norma_jerarquia_norm);
      const jB = indiceJerarquia(b.norma_jerarquia_norm);
      if (jA !== jB) return jA - jB;
      return b.similarity - a.similarity;
    });
    return anteponerExactos(exactos, candidatos);
  }
}
