import http from "http";

const OLLAMA_URL = "http://127.0.0.1:11434/api/embed";
const OLLAMA_MODEL = "mxbai-embed-large:latest";
const BATCH_SIZE = 1; 

async function embedBatch(textos: string[]): Promise<number[][]> {
  console.log(`\n    [Ollama] Enviando lote de ${textos.length} textos (vía http module)...`);
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OLLAMA_MODEL,
      input: textos,
    });

    const options = {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/embed",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body);
            resolve(json.embeddings);
          } catch (e) {
            reject(new Error("Error parseando respuesta de Ollama"));
          }
        } else {
          reject(new Error(`Ollama HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Error en request Ollama: ${e.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Embeds todos los textos usando Ollama.
 */
export async function embedTextosOllama(
  textos: string[],
  label = ""
): Promise<number[][]> {
  const total = textos.length;
  const embeddings: number[][] = [];
  const prefix = `  Embeddings (Ollama)${label ? " " + label : ""}`;
  process.stdout.write(`${prefix}: [0/${total}]`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const lote = textos.slice(i, i + BATCH_SIZE);
    try {
      const vecs = await embedBatch(lote);
      embeddings.push(...vecs);
    } catch (err) {
      console.error(`\n    [Ollama] Error en lote ${i}: ${(err as Error).message}`);
      throw err;
    }

    const done = Math.min(i + BATCH_SIZE, total);
    process.stdout.write(`\r${prefix}: [${done}/${total}]`);
  }

  console.log(" ✓");
  return embeddings;
}
