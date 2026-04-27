/**
 * retriever.ts — Recuperación por capas normativas
 *
 * Implementa una búsqueda en dos capas que respeta la jerarquía normativa
 * chilena: ley > reglamento > instruccion > resolucion > norma_tecnica > otro
 */

import { ChunkRecuperado } from "./rag";
import { PlanRecuperacion } from "./router";
import { embedText } from "./voyage";
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

// ─── Número máximo de chunks a retornar ──────────────────────────────────────

const MAX_CHUNKS = 16;

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
    norma_etapas_proyecto:
      (r.norma_etapas_proyecto as string[] | null) ?? [],
  };
}

// ─── Llamada al RPC match_chunks ─────────────────────────────────────────────

async function llamarMatchChunks(
  embedding: number[],
  count: number,
  filterTipos: string[] | null
): Promise<ChunkRecuperado[]> {
  const sb = getSupabaseServiceClient();

  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: count,
    filter_tipos: filterTipos,
    solo_vigentes: true,
  });

  if (error) throw new Error(`Error RPC match_chunks: ${error.message}`);
  if (!data?.length) return [];

  return (data as Record<string, unknown>[]).map(mapearChunk);
}

// ─── Función principal exportada ─────────────────────────────────────────────

/**
 * Recupera chunks en dos capas respetando la jerarquía normativa chilena.
 *
 * Capa 1 (alta jerarquía): LGUC, OGUC, Ley, DFL, DL
 * Capa 2 (amplia): todos los tipos del plan
 *
 * Los resultados se fusionan (sin duplicados), ordenan por jerarquía y
 * se limitan a MAX_CHUNKS (16).
 */
export async function recuperarPorCapas(
  pregunta: string,
  plan: PlanRecuperacion
): Promise<ChunkRecuperado[]> {
  // Generar embedding de la consulta
  const embedding = await embedText(pregunta, "query");

  // ── Capa 1: normas de alta jerarquía ──────────────────────────────────────
  const capa1 = await llamarMatchChunks(
    embedding,
    plan.matchCountPorCapa[0],
    TIPOS_ALTA_JERARQUIA
  );

  // ── Capa 2: todos los tipos del plan ─────────────────────────────────────
  const capa2 = await llamarMatchChunks(
    embedding,
    plan.matchCountPorCapa[1],
    plan.tiposNorma.length > 0 ? plan.tiposNorma : null
  );

  // ── Fusión: capa 1 primero, luego capa 2 sin duplicados ───────────────────
  const vistos = new Set<string>();
  const merged: ChunkRecuperado[] = [];

  for (const chunk of [...capa1, ...capa2]) {
    if (!vistos.has(chunk.id)) {
      vistos.add(chunk.id);
      merged.push(chunk);
    }
  }

  // ── Ordenar: jerarquía normativa (ascendente) y luego similarity (desc) ──
  merged.sort((a, b) => {
    const jA = indiceJerarquia(a.norma_jerarquia_norm);
    const jB = indiceJerarquia(b.norma_jerarquia_norm);
    if (jA !== jB) return jA - jB;
    return b.similarity - a.similarity;
  });

  // ── Limitar a MAX_CHUNKS ──────────────────────────────────────────────────
  return merged.slice(0, MAX_CHUNKS);
}
