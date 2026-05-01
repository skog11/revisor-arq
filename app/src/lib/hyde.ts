/**
 * hyde.ts — Hypothetical Document Embedding
 *
 * Antes de buscar en el corpus, genera un fragmento normativo hipotético
 * que respondería la consulta. Al embedear ese texto (que se parece a los
 * documentos reales del corpus), el vector de búsqueda queda más cerca
 * semánticamente de los chunks relevantes que la pregunta sola.
 *
 * Pipeline:
 *   1. Generar texto hipotético con Gemini Flash (~150 palabras)
 *   2. Embedear hipotético + query original por separado
 *   3. Promediar ambos vectores → embedding combinado
 *   4. Usar ese embedding combinado en la búsqueda vectorial
 *
 * Falla silencioso: si la generación falla (timeout, cuota), retorna
 * el embedding de la query original sin modificar.
 */

import { generateGemini, MODEL_FLASH } from "./gemini";
import { embedText } from "./voyage";

// ─── Prompt para generación hipotética ───────────────────────────────────────

const HYDE_SYSTEM = `Eres un redactor experto en normativa urbanística y de construcción chilena.
Tu tarea es generar un fragmento normativo hipotético de 100 a 150 palabras que respondería directamente a la consulta del usuario.

REGLAS:
- Escribe con el estilo formal y técnico de la LGUC, OGUC, DDU o decretos chilenos.
- Usa terminología técnica real: "permiso de edificación", "rasante", "coeficiente de constructibilidad", "ocupación de suelo", "antejardín", "recepción definitiva", "DOM", etc.
- NO incluyas explicaciones ni meta-comentarios. Solo el texto normativo.
- NO inventes números exactos de artículos. Usa frases como "Artículo N°..." o "conforme a la normativa aplicable...".
- El texto debe sonar como un extracto real de la normativa, no como una respuesta de chat.
- Máximo 150 palabras.`;

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Genera un embedding HyDE combinando la query original con un texto
 * normativo hipotético generado por el modelo.
 *
 * @param pregunta  Consulta original del usuario
 * @returns         Vector promediado [query + hipotético], o solo [query] si falla
 */
export async function embedConHyDE(pregunta: string): Promise<number[]> {
  // Siempre generamos el embedding de la query como base (fallback)
  const embeddingQuery = await embedText(pregunta, "query");

  try {
    // Generar texto hipotético con Gemini Flash (rápido, barato)
    const hipotetico = await generateGemini(
      HYDE_SYSTEM,
      pregunta,
      {
        modelo: MODEL_FLASH,
        temperature: 0.3,       // algo de variedad para cubrir distintos ángulos
        maxOutputTokens: 256,   // ~150 palabras
      }
    );

    if (!hipotetico || hipotetico.length < 30) {
      // Respuesta vacía o muy corta — usar solo query
      return embeddingQuery;
    }

    // Embedear el texto hipotético como "document" (similar a los chunks del corpus)
    const embeddingHipotetico = await embedText(hipotetico, "document");

    // Promediar los dos vectores componente a componente
    const combinado = embeddingQuery.map(
      (v, i) => (v + embeddingHipotetico[i]) / 2
    );

    // Normalizar a longitud unitaria (requerido para cosine similarity correcta)
    const norma = Math.sqrt(combinado.reduce((acc, v) => acc + v * v, 0));
    return combinado.map((v) => v / norma);

  } catch {
    // Falla silenciosa: devolver embedding original sin modificar
    return embeddingQuery;
  }
}
