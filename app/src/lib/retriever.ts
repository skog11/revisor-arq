/**
 * retriever.ts — Recuperación por capas normativas
 *
 * Implementa una búsqueda en dos capas que respeta la jerarquía normativa
 * chilena: ley > reglamento > instruccion > resolucion > norma_tecnica > otro
 */

import { ChunkRecuperado } from "./rag";
import { PlanRecuperacion } from "./router";
import { embedText, rerankDocuments } from "./voyage";
import { embedConHyDE } from "./hyde";
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

const TIPOS_ALTA_JERARQUIA = ["LGUC", "OGUC", "Ley", "DFL", "DL"];

// ─── Parámetros de recuperación ──────────────────────────────────────────────

/** Chunks que se pasan al modelo (ventana de contexto final) */
const MAX_CHUNKS = 20;

/** Candidatos pre-rerank (mayor diversidad → mejor reranking) */
const CANDIDATOS_RERANK = 50;

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
 */
function tieneTerminosExactos(pregunta: string): boolean {
  return (
    /art[íi]culo[s]?\s+\d+/i.test(pregunta) ||
    /\bart\.\s*\d+/i.test(pregunta) ||
    /\b(DDU|LGUC|OGUC|DS|DFL|DL)\s*[-–]?\s*\d+/i.test(pregunta) ||
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
 */
export async function recuperarPorCapas(
  pregunta: string,
  plan: PlanRecuperacion
): Promise<ChunkRecuperado[]> {
  // Instanciar cliente Supabase una sola vez para ambas capas
  const sb = getSupabaseServiceClient();

  // Generar embedding HyDE: promedio de [query original] + [texto normativo hipotético]
  // Falla silencioso → usa solo el embedding de la query si HyDE no está disponible
  const embedding = await embedConHyDE(pregunta);

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

  // ── Fusión: capa 1 primero, luego capa 2 sin duplicados ───────────────────
  const vistos = new Set<string>();
  const candidatos: ChunkRecuperado[] = [];

  for (const chunk of [...capa1, ...capa2]) {
    if (!vistos.has(chunk.id)) {
      vistos.add(chunk.id);
      candidatos.push(chunk);
    }
    if (candidatos.length >= CANDIDATOS_RERANK) break;
  }

  if (candidatos.length === 0) return [];

  // ── Reranking con voyage-rerank-2 ─────────────────────────────────────────
  // Falla silencioso: si rerank no está disponible (cuota, timeout),
  // se cae al fallback de ordenamiento por jerarquía + similitud.
  try {
    const documentos = candidatos.map((c) => c.texto);
    const resultados = await rerankDocuments(pregunta, documentos, MAX_CHUNKS);

    // Reconstruir array en el orden devuelto por rerank
    return resultados.map((r) => ({
      ...candidatos[r.index],
      // Sobrescribir similarity con el rerank score para que el UI
      // muestre la relevancia real (0-1 normalizado)
      similarity: Math.round(r.relevanceScore * 1000) / 1000,
    }));
  } catch {
    // Fallback: ordenar por jerarquía + similarity original
    candidatos.sort((a, b) => {
      const jA = indiceJerarquia(a.norma_jerarquia_norm);
      const jB = indiceJerarquia(b.norma_jerarquia_norm);
      if (jA !== jB) return jA - jB;
      return b.similarity - a.similarity;
    });
    return candidatos.slice(0, MAX_CHUNKS);
  }
}
