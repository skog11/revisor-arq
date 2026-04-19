export const VOYAGE_MODEL = "voyage-law-2";
export const EMBEDDING_DIM = 1024;
const BATCH_SIZE = 128;
const MAX_RETRIES = 3;

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

function getApiKey() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("Falta VOYAGE_API_KEY");
  return key;
}

export async function embedText(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await withRetry(() => fetchEmbeddings(batch));
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
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
    if (attempt >= MAX_RETRIES) throw err;
    await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    return withRetry(fn, attempt + 1);
  }
}
