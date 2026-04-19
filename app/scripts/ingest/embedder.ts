/**
 * Embedder para el pipeline de ingesta.
 * Modelo: gemini-embedding-001 (outputDimensionality=1024).
 * Rate limit free tier: 100 RPM / 1500 RPD — muy superior al free tier de Voyage.
 *
 * Si en el futuro se desea migrar a voyage-law-2, solo cambiar la función
 * embedBatch() sin tocar el resto del pipeline (los vectores siguen siendo 1024 dims).
 */

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";

const OUTPUT_DIM = 1024;
const BATCH_SIZE = 50;         // mitad del máximo para más margen de rate limit
const MAX_RETRIES = 9;         // espera hasta 3*(2^8)=768s si necesario (rate limit agresivo)
const RETRY_BASE_MS = 3_000;
const BETWEEN_BATCHES_MS = 10_000; // 10s entre batches

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error("No se encontró GEMINI_API_KEY en las variables de entorno");
  return key;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Embeds un batch con la API de Gemini batch embeddings.
 * Retorna un array de vectores de 1024 dimensiones.
 */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GEMINI_EMBED_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: "models/gemini-embedding-001",
            content: { role: "user", parts: [{ text }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: OUTPUT_DIM,
          })),
        }),
      });

      if (res.status === 429 || res.status === 503) {
        const body = await res.text();
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`  ⚠ Gemini ${res.status}: ${body.slice(0, 100)} — esperando ${waitMs}ms...`);
        lastError = new Error(`${res.status}: ${body.slice(0, 100)}`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        embeddings: { values: number[] }[];
      };

      return json.embeddings.map((e) => e.values);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Gemini HTTP")) throw err;
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`  ⚠ Error (intento ${attempt + 1}): ${lastError.message.slice(0, 80)} — ${waitMs}ms`);
        await sleep(waitMs);
      }
    }
  }

  throw lastError ?? new Error("Error desconocido en embedBatch");
}

/**
 * Embeds todos los textos en batches de BATCH_SIZE.
 * Muestra progreso en consola.
 */
export async function embedTextos(
  textos: string[],
  label = ""
): Promise<number[][]> {
  const total = textos.length;
  const embeddings: number[][] = new Array(total);
  const batches = Math.ceil(total / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const desde = b * BATCH_SIZE;
    const hasta = Math.min(desde + BATCH_SIZE, total);
    const batch = textos.slice(desde, hasta);

    process.stdout.write(
      `  Embeddings${label ? " " + label : ""}: batch ${b + 1}/${batches} (${batch.length} textos)... `
    );

    const batchEmbeddings = await embedBatch(batch);
    for (let i = 0; i < batchEmbeddings.length; i++) {
      embeddings[desde + i] = batchEmbeddings[i];
    }

    console.log("✓");

    if (b < batches - 1) {
      await sleep(BETWEEN_BATCHES_MS);
    }
  }

  return embeddings;
}
