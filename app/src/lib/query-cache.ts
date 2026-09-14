/**
 * query-cache.ts - Cache semantica de respuestas RAG
 *
 * Antes de ejecutar el pipeline completo (retrieval + LLM), busca en Supabase
 * si ya existe una respuesta para una query semanticamente muy similar.
 * Umbral por defecto: 0.97 cosine similarity (casi identicas).
 *
 * TTL: 7 dias (configurable). El campo `hits` registra cuantas veces se sirvio
 * la respuesta desde cache para analitica.
 */

import { getSupabaseServiceClient } from "./supabase";
import { validarRespuesta } from "./rag";
import type { Fuente } from "@/components/chat/mensaje";

const SIMILARITY_THRESHOLD = 0.97; // muy estricto: solo queries casi identicas
const MAX_AGE_HOURS = 168;         // 7 dias

export function construirVersionContextoCache(versiones: { corpus?: string; reglas?: string; prompt?: string }): string {
  return [`corpus:${versiones.corpus ?? "sin-version"}`, `reglas:${versiones.reglas ?? "sin-version"}`, `prompt:${versiones.prompt ?? "sin-version"}`].join("|");
}

// --- Invalidacion automatica -------------------------------------------------
//
// OJO: hasta 2026-09-14 la version del contexto salia de tres variables de
// entorno (CORPUS_RELEASE_ID, REGLAS_RELEASE_ID, PROMPT_RELEASE_ID) que habia
// que subir a mano en Vercel. Nadie las movio desde 2026-07-30, asi que la
// cache siguio sirviendo respuestas viejas despues de ingestar la normativa
// tributaria (septiembre) y despues de cambiar prompts y retrieval. Se
// detecto porque una consulta de prueba devolvia la respuesta rota de antes
// del fix: `last_hit_at` era posterior al deploy pero `created_at` anterior.
//
// Ahora la version se deriva de dos cosas que cambian solas:
//   - el SHA del commit desplegado (Vercel lo inyecta en cada deploy), que
//     cubre prompts, reglas y cualquier cambio de codigo del pipeline;
//   - una huella del corpus (numero de normas vigentes, ultima actualizacion
//     y numero de chunks), que cubre ingestas y limpiezas hechas por script o
//     por SQL directo, sin pasar por un deploy.
// Las variables de entorno quedan como respaldo para entornos sin Vercel.

const HUELLA_TTL_MS = 10 * 60 * 1000; // 10 min: una consulta extra por instancia cada 10 min
let huellaCorpusCache: { valor: string; expira: number } | null = null;

async function huellaCorpus(): Promise<string> {
  const ahora = Date.now();
  if (huellaCorpusCache && huellaCorpusCache.expira > ahora) return huellaCorpusCache.valor;

  let valor = process.env.CORPUS_RELEASE_ID ?? "sin-version";
  try {
    const sb = getSupabaseServiceClient();
    const [normas, chunks] = await Promise.all([
      sb.from("normas").select("fecha_actualizacion", { count: "exact" })
        .eq("vigente", true).order("fecha_actualizacion", { ascending: false }).limit(1),
      sb.from("chunks").select("id", { count: "exact", head: true }),
    ]);
    const nNormas = normas.count ?? 0;
    const ultima = (normas.data?.[0] as { fecha_actualizacion?: string } | undefined)?.fecha_actualizacion ?? "-";
    const nChunks = chunks.count ?? 0;
    if (nNormas > 0 || nChunks > 0) valor = `${nNormas}n-${nChunks}c-${ultima}`;
  } catch {
    // Sin BD disponible: se conserva el valor de entorno.
  }

  huellaCorpusCache = { valor, expira: ahora + HUELLA_TTL_MS };
  return valor;
}

function versionCodigo(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 12) : (process.env.PROMPT_RELEASE_ID ?? "sin-version");
}

async function versionContextoActual(): Promise<string> {
  return construirVersionContextoCache({
    corpus: await huellaCorpus(),
    reglas: process.env.REGLAS_RELEASE_ID ?? versionCodigo(),
    prompt: versionCodigo(),
  });
}

export interface CacheHit {
  id: string;
  respuesta: string;
  fuentes: Fuente[];
  similarity: number;
}

/**
 * Busca en cache una respuesta para la query dada.
 * Retorna null si no hay hit o si la cache no esta disponible.
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
      query_context_version: await versionContextoActual(),
      similarity_threshold: SIMILARITY_THRESHOLD,
      max_age_hours: MAX_AGE_HOURS,
    });

    if (error || !data?.length) return null;

    const row = data[0] as { id: string; respuesta: string; fuentes: unknown; hits: number; similarity: number };
    if (row.similarity < SIMILARITY_THRESHOLD) return null;

    // Una respuesta que no pasa los guardrails minimos no debe servirse aunque
    // este guardada: hubo un periodo en que se cachearon respuestas truncadas.
    if (!validarRespuesta(row.respuesta).valida) return null;

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
    // Cache no disponible (tabla no existe, etc.) - continuar sin cache
    return null;
  }
}

/**
 * Guarda una respuesta nueva en cache.
 * Fire-and-forget: no bloquea el stream ni propaga errores.
 */
export function guardarEnCache(
  embedding: number[],
  queryTexto: string,
  modo: string,
  respuesta: string,
  fuentes: Fuente[]
): void {
  // El unico filtro era "mas de 100 caracteres", asi que una respuesta cortada
  // a media frase por un corte de generacion se cacheaba y se servia durante
  // 7 dias. validarRespuesta() exige ademas el disclaimer legal, que el
  // sintetizador solo emite al terminar: sirve como senal de respuesta completa.
  if (!respuesta || respuesta.length < 100) return;
  if (!validarRespuesta(respuesta).valida) return;
  if (!fuentes.length) return; // sin fuentes no hay nada que valga la pena cachear

  void (async () => {
    try {
      const sb = getSupabaseServiceClient();
      const { error } = await sb.from("query_cache").insert({
        embedding,
        query_texto: queryTexto.slice(0, 500),
        modo,
        context_version: await versionContextoActual(),
        respuesta,
        fuentes,
      });
      if (error) console.warn("[cache] Error guardando en cache:", error.message);
    } catch (err) {
      console.warn("[cache] Error guardando en cache:", err instanceof Error ? err.message : err);
    }
  })();
}