/**
 * Embedder para el pipeline de ingesta.
 * Modelo: gemini-embedding-001 (outputDimensionality=1024).
 *
 * Usa llamadas individuales a embedContent (no batchEmbedContents) para
 * controlar con precisión el rate limit (100 RPM free tier).
 * Cada texto = 1 llamada. Pausa configurable entre llamadas.
 *
 * Con CALL_INTERVAL_MS=700ms → ~85 RPM → siempre bajo el límite de 100 RPM.
 * Tiempo estimado por norma:
 *   LGUC (280 textos): ~3.3 minutos
 *   OGUC (806 textos): ~9.4 minutos
 *   DDU mediana (40 textos): ~28 segundos
 */

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const OUTPUT_DIM = 1024;
const CALL_INTERVAL_MS = 700;  // 700ms entre llamadas → ~85 RPM (límite: 100 RPM)
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 5_000;   // 5s base para backoff exponencial

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
 * Embeds un texto individual con retry exponencial.
 */
async function embedOne(text: string): Promise<number[]> {
  const key = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GEMINI_EMBED_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { role: "user", parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: OUTPUT_DIM,
        }),
      });

      if (res.status === 429 || res.status === 503) {
        const body = await res.text();
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        process.stdout.write(`⚠${res.status} `);
        lastError = new Error(`${res.status}: ${body.slice(0, 80)}`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as { embedding: { values: number[] } };
      return json.embedding.values;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Gemini HTTP")) throw err;
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        process.stdout.write(`⚠err `);
        await sleep(waitMs);
      }
    }
  }

  throw lastError ?? new Error("Error desconocido en embedOne");
}

/**
 * Embeds todos los textos con un intervalo fijo entre llamadas.
 * Muestra barra de progreso en consola.
 */
export async function embedTextos(
  textos: string[],
  label = ""
): Promise<number[][]> {
  const total = textos.length;
  const embeddings: number[][] = new Array(total);

  const prefix = `  Embeddings${label ? " " + label : ""}`;
  process.stdout.write(`${prefix}: [0/${total}]`);

  for (let i = 0; i < total; i++) {
    embeddings[i] = await embedOne(textos[i]);

    // Actualizar progreso cada 10 textos o al final
    if ((i + 1) % 10 === 0 || i === total - 1) {
      process.stdout.write(`\r${prefix}: [${i + 1}/${total}]`);
    }

    // Pausa entre llamadas (excepto la última)
    if (i < total - 1) {
      await sleep(CALL_INTERVAL_MS);
    }
  }

  console.log(" ✓");
  return embeddings;
}
