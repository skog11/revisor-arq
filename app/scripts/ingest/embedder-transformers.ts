import { pipeline } from '@xenova/transformers';

let embedder: any = null;

// Modelo BGE-M3: Multilingüe, soporta 1024 dims (y hasta 8192 tokens)
const MODEL_NAME = 'Xenova/bge-m3';

async function getEmbedder() {
  if (!embedder) {
    console.log(`\n    [Transformers] Cargando modelo ${MODEL_NAME} (esto descargará ~1GB la primera vez)...`);
    embedder = await pipeline('feature-extraction', MODEL_NAME);
  }
  return embedder;
}

/**
 * Embeds un lote de textos usando Transformers.js (local).
 */
export async function embedTextosTransformers(
  textos: string[],
  label = ""
): Promise<number[][]> {
  const extractor = await getEmbedder();
  const total = textos.length;
  const embeddings: number[][] = [];
  const prefix = `  Embeddings (Transformers)${label ? " " + label : ""}`;
  
  process.stdout.write(`${prefix}: [0/${total}]`);

  for (let i = 0; i < textos.length; i++) {
    // Transformers.js en Node suele ser mejor procesando de a 1 para evitar picos de memoria
    const output = await extractor(textos[i], { pooling: 'mean', normalize: true });
    
    // Convertir Tensor a Array y asegurar dimensión 1024
    // BGE-M3 produce 1024 por defecto
    const vector = Array.from(output.data) as number[];
    embeddings.push(vector);

    if ((i + 1) % 10 === 0 || i === total - 1) {
      process.stdout.write(`\r${prefix}: [${i + 1}/${total}]`);
    }
  }

  console.log(" ✓");
  return embeddings;
}
