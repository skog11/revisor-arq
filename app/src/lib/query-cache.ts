/**
 * query-cache.ts — Caché semántica de respuestas RAG
 *
 * Antes de ejecutar el pipeline completo (retrieval + LLM), busca en Supabase
 * si ya existe una respuesta para una query semánticamente muy similar.
 * Umbral por defecto: 0.97 cosine similarity (casi idénticas).
 *
 * TTL: 7 días (configurable). El campo `hits` registra cuántas veces se sirvió
 * la respuesta desde caché para analítica.
 */

import { getSupabaseServiceClient } from "./supabase";
import type { Fuente } from "@/components/chat/mensaje";

const SIMILARITY_THRESHOLD = 0.97; // muy estricto: solo queries casi idénticas
const MAX_AGE_HOURS = 168;         // 7 días

export interface CacheHit {
  id: string;
  respuesta: string;
  fuentes: Fuente[];
  similarity: number;
}

/**
 * Busca en caché una respuesta para la query dada.
 * Retorna null si no hay hit o si la caché no está disponible.
 */
export async function buscarEnCache(
  embedding: number[],
  modo: string
): Promise<CacheHit | null> {
  try {
    const sb = getSupabaseServiceClient();
    const { data, error } = await sb.rpc("match_query_cache", {
      query_embedding: embedding,
      query_modo: modo,
      similarity_threshold: SIMILARITY_THRESHOLD,
      max_age_hours: MAX_AGE_HOURS,
    });

    if (error || !data?.length) return null;

    const row = data[0] as { id: string; respuesta: string; fuentes: unknown; hits: number; similarity: number };
    if (row.similarity < SIMILARITY_THRESHOLD) return null;

    // Registrar hit (fire-and-forget)
    sb.from("query_cache")
      .update({ hits: row.hits + 1, last_hit_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => {});

    return {
      id: row.id,
      respuesta: row.respuesta,
      fuentes: Array.isArray(row.fuentes) ? (row.fuentes as Fuente[]) : [],
      similarity: row.similarity,
    };
  } catch {
    // Caché no disponible (tabla no existe, etc.) — continuar sin caché
    return null;
  }
}

/**
 * Guarda una respuesta nueva en caché.
 * Fire-and-forget: no bloquea el stream ni propaga errores.
 */
export function guardarEnCache(
  embedding: number[],
  queryTexto: string,
  modo: string,
  respuesta: string,
  fuentes: Fuente[]
): void {
  if (!respuesta || respuesta.length < 100) return; // no cachear respuestas triviales

  const sb = getSupabaseServiceClient();
  sb.from("query_cache")
    .insert({
      embedding,
      query_texto: queryTexto.slice(0, 500),
      modo,
      respuesta,
      fuentes,
    })
    .then(({ error }) => {
      if (error) console.warn("[cache] Error guardando en caché:", error.message);
    });
}
