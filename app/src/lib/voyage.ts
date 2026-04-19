import { VoyageAIClient } from "voyageai";

export const VOYAGE_MODEL = "voyage-law-2";
export const EMBEDDING_DIM = 1024;
const BATCH_SIZE = 128;
const MAX_RETRIES = 3;

function getClient() {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("Falta VOYAGE_API_KEY");
  return new VoyageAIClient({ apiKey });
}

export async function embedText(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await withRetry(() =>
      client.embed({ input: batch, model: VOYAGE_MODEL }),
    );
    for (const item of result.data ?? []) {
      allEmbeddings.push(item.embedding as number[]);
    }
  }

  return allEmbeddings;
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
