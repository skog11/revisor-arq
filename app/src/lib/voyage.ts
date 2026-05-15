export const VOYAGE_MODEL = "voyage-law-2";
export const RERANK_MODEL = "rerank-2";
export const EMBEDDING_DIM = 1024;
const BATCH_SIZE = 128;
const MAX_RETRIES = 3;

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_RERANK_URL = "https://api.voyageai.com/v1/rerank";

/**
 * input_type mejora la calidad de embeddings en voyage-law-2:
 * - "query": para búsquedas semánticas (consultas del usuario)
 * - "document": para indexar documentos (ingesta de normativa)
 * null = comportamiento por defecto (compatible con ambos usos)
 */
export type VoyageInputType = "query" | "document" | null;

function getApiKey() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("Falta VOYAGE_API_KEY");
  return key;
}

/**
 * Embebe un solo texto. Pasar inputType="query" para consultas de usuario.
 */
export async function embedText(
  text: string,
  inputType: VoyageInputType = null
): Promise<number[]> {
  const result = await embedBatch([text], inputType);
  return result[0];
}

/**
 * Embebe un lote de textos. Pasar inputType="document" para ingesta.
 */
export async function embedBatch(
  texts: string[],
  inputType: VoyageInputType = null
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await withRetry(() => fetchEmbeddings(batch, inputType));
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

async function fetchEmbeddings(
  texts: string[],
  inputType: VoyageInputType = null
): Promise<number[][]> {
  const body: Record<string, unknown> = { input: texts, model: VOYAGE_MODEL };
  if (inputType) body.input_type = inputType;

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000), // 15s máximo para embedding
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

async function withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const name   = (err as Error).name    ?? "";
    const message = (err as Error).message ?? "";

    // No reintentar en timeouts/aborts — ya esperamos suficiente
    if (name === "AbortError" || name === "TimeoutError") throw err;

    // No reintentar en errores de autenticación (401/403): reintentar es inútil
    // y consumiría quota de Gemini sin posibilidad de recuperación.
    if (message.includes("401") || message.includes("403")) {
      throw new Error(
        `[Voyage] API key inválida o sin permisos (${message.slice(0, 120)}). ` +
        "Verifica VOYAGE_API_KEY en las variables de entorno."
      );
    }

    if (attempt >= MAX_RETRIES) throw err;
    await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    return withRetry(fn, attempt + 1);
  }
}

// ─── Reranking ────────────────────────────────────────────────────────────────

export interface RerankResult {
  index: number;        // Índice original en el array de documentos
  relevanceScore: number;
}

/**
 * Reordena documentos por relevancia usando voyage-rerank-2.
 * Devuelve los índices originales ordenados de mayor a menor score.
 *
 * @param query    Consulta del usuario (ya embebida, pero rerank usa texto)
 * @param documents Textos de los chunks a reordenar
 * @param topK     Cuántos devolver (por defecto todos)
 */
export async function rerankDocuments(
  query: string,
  documents: string[],
  topK?: number
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];

  const body: Record<string, unknown> = {
    model: RERANK_MODEL,
    query,
    documents,
    return_documents: false,
  };
  if (topK !== undefined) body.top_k = topK;

  const res = await fetch(VOYAGE_RERANK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage Rerank error ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data: { index: number; relevance_score: number }[];
  };

  return json.data.map((d) => ({
    index: d.index,
    relevanceScore: d.relevance_score,
  }));
}
