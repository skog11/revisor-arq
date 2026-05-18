/**
 * multi-query.ts — Multi-Query Retrieval
 *
 * Genera 3 variantes semánticas de la pregunta original usando Gemini Flash,
 * hace una búsqueda vectorial por cada variante, y fusiona los resultados
 * con Reciprocal Rank Fusion (RRF) para maximizar cobertura del corpus.
 *
 * Problema que resuelve:
 *   Una sola query puede no cubrir todos los términos normativos relevantes.
 *   Ej: "altura máxima edificio" puede perderse chunks que usan "rasante",
 *   "número de pisos" o "coeficiente de constructibilidad".
 *
 * Pipeline:
 *   1. Generar 3 variantes con Gemini Flash (paralelo)
 *   2. Embedear todas las variantes (+ query original) con HyDE
 *   3. Buscar en Supabase con cada embedding (paralelo)
 *   4. Fusionar con RRF → lista ordenada sin duplicados
 */

import { generateWithFallback, MODEL_FLASH } from "./gemini";
import { embedText } from "./voyage";
import { getSupabaseServiceClient } from "./supabase";
import { type ChunkRecuperado } from "./rag";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Variantes adicionales a generar (además de la query original) */
const NUM_VARIANTES = 3;

/** K para RRF — controla el decaimiento de ranking (60 es estándar) */
const RRF_K = 60;

// ─── Generación de variantes ─────────────────────────────────────────────────

const MULTI_QUERY_SYSTEM = `Eres un experto en normativa urbanística y de construcción chilena.
Tu tarea es generar variantes de búsqueda para una consulta sobre normativa.

Genera exactamente ${NUM_VARIANTES} reformulaciones de la consulta que:
1. Usen terminología técnica diferente pero equivalente (sinónimos normativos chilenos)
2. Enfoquen distintos aspectos del mismo tema normativo
3. Incluyan términos que probablemente aparezcan en la LGUC, OGUC o DDU relevante

FORMATO DE RESPUESTA — solo las variantes, una por línea, sin numeración ni explicaciones:
variante1
variante2
variante3`;

async function generarVariantes(pregunta: string): Promise<string[]> {
  try {
    // maxRetries:1 — generarVariantes tiene fallback a array vacío, no necesita backoff largo
    const respuesta = await generateWithFallback(
      MULTI_QUERY_SYSTEM,
      pregunta,
      { modelo: MODEL_FLASH, temperature: 0.4, maxOutputTokens: 200 }
    );

    const variantes = respuesta
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && l.length < 500)
      .slice(0, NUM_VARIANTES);

    return variantes;
  } catch {
    // Falla silenciosa — devolver array vacío (usará solo query original)
    return [];
  }
}

// ─── RRF Fusion ───────────────────────────────────────────────────────────────

/**
 * Reciprocal Rank Fusion: combina múltiples rankings en uno solo.
 * Score RRF de un doc = Σ 1/(k + rank_i) para cada lista i donde aparece.
 */
function rrfFusion(
  listas: ChunkRecuperado[][],
  topK: number
): ChunkRecuperado[] {
  const scores = new Map<string, number>();
  const chunks = new Map<string, ChunkRecuperado>();

  for (const lista of listas) {
    lista.forEach((chunk, rank) => {
      const score = 1 / (RRF_K + rank + 1);
      scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + score);
      if (!chunks.has(chunk.id)) chunks.set(chunk.id, chunk);
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({
      ...chunks.get(id)!,
      similarity: Math.round(score * 1000) / 1000,
    }));
}

// ─── Búsqueda vectorial directa ───────────────────────────────────────────────

async function buscarConEmbedding(
  embedding: number[],
  count: number,
  filterTipos: string[] | null,
  soloVigentes: boolean
): Promise<ChunkRecuperado[]> {
  const sb = getSupabaseServiceClient();

  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: count,
    filter_tipos: filterTipos,
    solo_vigentes: soloVigentes,
  });

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    texto: r.texto as string,
    similarity: r.similarity as number,
    norma_tipo: r.norma_tipo as string,
    norma_numero: r.norma_numero as string,
    norma_titulo: r.norma_titulo as string,
    articulo: (r.metadatos as Record<string, unknown>)?.articulo as string | null,
    jerarquia: (r.metadatos as Record<string, unknown>)?.jerarquia as string | null,
    url_fuente: r.fuente as string,
    fecha_vigencia_desde: r.fecha_vigencia_desde as string | null,
    norma_dominio: (r.norma_dominio as string | null) ?? null,
    norma_organo_emisor: (r.norma_organo_emisor as string | null) ?? null,
    norma_jerarquia_norm: (r.norma_jerarquia_norm as string | null) ?? null,
    norma_etapas_proyecto: Array.isArray(r.norma_etapas_proyecto)
      ? (r.norma_etapas_proyecto as string[])
      : [],
  }));
}

// ─── Función principal exportada ─────────────────────────────────────────────

/**
 * Multi-query retrieval con RRF fusion.
 *
 * @param pregunta        Consulta original del usuario
 * @param topK            Número máximo de chunks a devolver tras fusión RRF
 * @param filterTipos     Filtro de tipos de norma (null = todos)
 * @param soloVigentes    Solo normas vigentes
 * @param embeddingBase   Embedding pre-computado de la query (evita una llamada Gemini extra).
 *                        Si no se pasa, se genera con embedText directo.
 */
export async function recuperarMultiQuery(
  pregunta: string,
  topK: number,
  filterTipos: string[] | null,
  soloVigentes: boolean,
  embeddingBase?: number[]
): Promise<ChunkRecuperado[]> {
  // 1. Generar variantes semánticas con Gemini (1 llamada)
  const variantes = await generarVariantes(pregunta);

  // 2. Embedding de la query original — reusar el pre-computado si viene del retriever
  //    Para las variantes usamos embedText directo (sin HyDE): las variantes ya
  //    son reformulaciones especializadas y no necesitan el hipotético extra.
  //    Esto reduce de ~5 llamadas Gemini a 0 llamadas adicionales aquí.
  const embeddingOriginal = embeddingBase ?? await embedText(pregunta, "query");

  const todasLasQueries = [pregunta, ...variantes];
  const embeddings = await Promise.all(
    todasLasQueries.map((q, i) =>
      i === 0
        ? Promise.resolve(embeddingOriginal)  // reusar embedding base
        : embedText(q, "query")               // Voyage AI, sin Gemini
    )
  );

  // 3. Buscar con cada embedding en paralelo (solo Supabase, sin Gemini)
  const perQuery = Math.max(Math.ceil(topK / todasLasQueries.length) + 5, 10);
  const resultados = await Promise.all(
    embeddings.map((emb) =>
      buscarConEmbedding(emb, perQuery, filterTipos, soloVigentes)
    )
  );

  // 4. Fusionar con RRF
  return rrfFusion(resultados, topK);
}
