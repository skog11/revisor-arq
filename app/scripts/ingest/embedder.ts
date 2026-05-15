/**
 * Embedder para el pipeline de ingesta.
 * Modelo: Voyage AI voyage-law-2 (dim 1024) — mismo que usa la app en producción.
 *
 * Rate limit Voyage AI: 300 RPM en tier free → intervalo 250ms entre lotes.
 * Lote máximo: 128 textos por llamada.
 *
 * Tiempo estimado:
 *   LGUC  (~284 textos): ~3 lotes → < 5s
 *   OGUC  (~820 textos): ~7 lotes → < 15s
 *   DDU mediana (~40):   1 lote   → < 2s
 */

const VOYAGE_EMBED_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-law-2";
const OUTPUT_DIM = 1024;
const BATCH_SIZE = 128;         // Aumentado a 128 (máximo de Voyage)
const CALL_INTERVAL_MS = 250;   // Reducido a 250ms (aprox 240 RPM, seguro para límite de 300)
const MAX_RETRIES = 5;          // Más reintentos para mayor resiliencia
const RETRY_BASE_MS = 2_000;    // Reintentos más rápidos (2s base)

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("No se encontró VOYAGE_API_KEY en las variables de entorno");
  return key;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedBatch(textos: string[]): Promise<number[][]> {
  const key = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(VOYAGE_EMBED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          input: textos,
          model: VOYAGE_MODEL,
          input_type: "document",
          output_dimension: OUTPUT_DIM,
        }),
      });

      if (res.status === 429 || res.status === 503) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        process.stdout.write(`⚠${res.status} `);
        lastError = new Error(`HTTP ${res.status}`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Voyage HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as { data: { embedding: number[] }[] };
      return json.data.map((d) => d.embedding);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Voyage HTTP")) throw err;
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("Error desconocido en embedBatch");
}

/**
 * Embeds todos los textos en lotes. Muestra progreso en consola.
 */
export async function embedTextos(
  textos: string[],
  label = ""
): Promise<number[][]> {
  const total = textos.length;
  const embeddings: number[][] = [];
  const prefix = `  Embeddings${label ? " " + label : ""}`;
  process.stdout.write(`${prefix}: [0/${total}]`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const lote = textos.slice(i, i + BATCH_SIZE);
    const vecs = await embedBatch(lote);
    embeddings.push(...vecs);

    const done = Math.min(i + BATCH_SIZE, total);
    process.stdout.write(`\r${prefix}: [${done}/${total}]`);

    if (done < total) await sleep(CALL_INTERVAL_MS);
  }

  console.log(" ✓");
  return embeddings;
}
