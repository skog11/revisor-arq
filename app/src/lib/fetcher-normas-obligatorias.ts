/**
 * fetcher-normas-obligatorias.ts — Recupera chunks de normas específicas por clave.
 *
 * Cuando el motor de reglas detecta que una norma (ej. DDU-161) debe estar en el
 * paquete de evidencia, este módulo trae los mejores chunks de esa norma para
 * inyectarlos junto al retrieval semántico estándar.
 */

import { getSupabaseServiceClient } from "./supabase";
import type { ChunkRecuperado } from "./rag";
import { normalizarArticulo, type CitaNormativaDetectada } from "./validador";

/** Recupera la evidencia exacta de artículos que el borrador citó pero el RAG no trajo. */
export async function fetchChunksPorArticulos(citas: CitaNormativaDetectada[]): Promise<ChunkRecuperado[]> {
  const sb = getSupabaseServiceClient();
  const resultado: ChunkRecuperado[] = [];
  for (const cita of citas) {
    // Una cita sin abreviatura es ambigua; se contrasta contra los dos cuerpos
    // generales que rigen la mayoría de consultas urbanísticas antes de rechazarla.
    const tipos = !cita.tipo ? ["LGUC", "OGUC"]
      : cita.tipo === "LEY" ? ["LEY", "LGUC"]
      : [cita.tipo];
    for (const tipo of tipos) {
      const { data: normas } = await sb
        .from("normas")
        // El esquema productivo conserva estos campos base; los atributos de
        // catalogación extendida se completan como nulos abajo para que una
        // migración parcial no impida recuperar evidencia normativa exacta.
        .select("id, tipo, numero, titulo, url_fuente")
        .eq("tipo", tipo)
        .eq("vigente", true)
        .limit(5);
      for (const norma of normas ?? []) {
      // El corpus contiene tanto claves sin punto final como claves heredadas
      // con punto final. Se consultan ambas y se filtran con la misma
      // normalización que usa el validador.
      const articulo = normalizarArticulo(cita.articulo);
      const { data: chunks } = await sb
        .from("chunks")
        .select("id, texto, metadatos")
        .eq("norma_id", norma.id)
        .in("metadatos->>articulo", [articulo, `${articulo}.`])
        .limit(6);
      for (const c of (chunks ?? []).filter((chunk) =>
        normalizarArticulo(((chunk.metadatos as Record<string, unknown>)?.articulo as string | undefined)) === articulo
      )) {
        const meta = (c.metadatos as Record<string, unknown>) ?? {};
        resultado.push({
          id: c.id as string, texto: c.texto as string, similarity: 1,
          norma_tipo: norma.tipo as string, norma_numero: norma.numero as string,
          norma_titulo: norma.titulo as string, articulo: (meta.articulo as string | null) ?? null,
          jerarquia: (meta.jerarquia as string | null) ?? null, url_fuente: norma.url_fuente as string,
          fecha_vigencia_desde: null, norma_dominio: null,
          norma_organo_emisor: null, norma_jerarquia_norm: null,
          norma_etapas_proyecto: [],
        });
      }
    }
    }
  }
  return resultado;
}

export function priorizarChunksObligatorios<T extends { orden: number; metadatos: unknown }>(chunks: T[], consulta: string, limite: number): T[] {
  const articulo = consulta.match(/\b(?:art[íi]culo|art\.)\s*([\d.]+[°º]?)/i)?.[1]?.replace(/[°º]/g, "").trim();
  return [...chunks]
    .sort((a, b) => {
      if (!articulo) return a.orden - b.orden;
      const artA = ((a.metadatos as Record<string, unknown>)?.articulo as string | undefined)?.replace(/[°º]/g, "").trim();
      const artB = ((b.metadatos as Record<string, unknown>)?.articulo as string | undefined)?.replace(/[°º]/g, "").trim();
      return Number(artA !== articulo) - Number(artB !== articulo) || a.orden - b.orden;
    })
    .slice(0, limite);
}

/**
 * Dado un conjunto de claves de norma (formato "TIPO-NUMERO", ej. "DDU-161"),
 * recupera los primeros N chunks de cada una y los devuelve como ChunkRecuperado.
 *
 * Si no encuentra una norma, simplemente la omite (silencioso). Si una clave es
 * solo "LGUC" o "OGUC", trae los primeros chunks de esa norma sin filtrar.
 *
 * @param claves   Array de claves como ["DDU-161", "LGUC"]
 * @param porNorma Cuántos chunks traer por cada norma (default 3)
 */
export async function fetchChunksObligatorios(
  claves: string[],
  porNorma = 3,
  consulta = ""
): Promise<ChunkRecuperado[]> {
  if (claves.length === 0) return [];

  const sb = getSupabaseServiceClient();
  const resultados: ChunkRecuperado[] = [];

  for (const clave of claves) {
    const [tipo, ...numeroParts] = clave.split("-");
    const numero = numeroParts.join("-");

    let query = sb
      .from("normas")
      .select("id, tipo, numero, titulo, url_fuente")
      .eq("tipo", tipo)
      .eq("vigente", true)
      .limit(1);

    if (numero) {
      query = query.eq("numero", numero);
    }

    const { data: normaData, error: normaErr } = await query;
    if (normaErr || !normaData || normaData.length === 0) {
      // Norma no encontrada por tipo+numero. Si solo se pidió "LGUC" u "OGUC", podría
      // estar registrada como "LGUC-DFL-458" — buscar por tipo solo, tomar el primero.
      if (!numero) {
        const { data: fallback } = await sb
          .from("normas")
          .select("id, tipo, numero, titulo, url_fuente")
          .eq("tipo", tipo)
          .eq("vigente", true)
          .limit(1);
        if (!fallback || fallback.length === 0) continue;
        normaData?.push(...fallback);
      } else {
        continue;
      }
    }

    const norma = normaData![0];

    // Recuperar los primeros N chunks por orden
    const { data: chunks, error: chunksErr } = await sb
      .from("chunks")
      .select("id, texto, tokens, orden, metadatos")
      .eq("norma_id", norma.id)
      .order("orden", { ascending: true })
      .limit(Math.max(porNorma * 20, 60));

    if (chunksErr || !chunks) continue;

    for (const c of priorizarChunksObligatorios(chunks, consulta, porNorma)) {
      const meta = (c.metadatos as Record<string, unknown>) ?? {};
      resultados.push({
        id: c.id as string,
        texto: c.texto as string,
        similarity: 1.0, // similarity ficticia — chunk forzado por regla
        norma_tipo: norma.tipo as string,
        norma_numero: norma.numero as string,
        norma_titulo: norma.titulo as string,
        articulo: (meta.articulo as string | null) ?? null,
        jerarquia: (meta.jerarquia as string | null) ?? null,
        url_fuente: norma.url_fuente as string,
        fecha_vigencia_desde: null, norma_dominio: null,
        norma_organo_emisor: null, norma_jerarquia_norm: null,
        norma_etapas_proyecto: [],
      });
    }
  }

  return resultados;
}

/**
 * Mergea chunks obligatorios con chunks recuperados por similarity, eliminando
 * duplicados (mismo id) y poniendo los obligatorios al inicio.
 */
export function mergearChunks(
  obligatorios: ChunkRecuperado[],
  recuperados: ChunkRecuperado[]
): ChunkRecuperado[] {
  const idsObligatorios = new Set(obligatorios.map((c) => c.id));
  const recuperadosPorId = new Map(recuperados.map((c) => [c.id, c]));
  // Una expansión puede recuperar de nuevo el mismo chunk. En ese caso se
  // conserva su procedencia para que la referencia explícita no pierda prioridad.
  const obligatoriosConProcedencia = obligatorios.map((chunk) => ({
    ...chunk,
    referenciaExacta: chunk.referenciaExacta || recuperadosPorId.get(chunk.id)?.referenciaExacta,
  }));
  const resto = recuperados.filter((c) => !idsObligatorios.has(c.id));
  return [...obligatoriosConProcedencia, ...resto];
}
