import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const ParametrosSchema = z.object({
  parametros: z.array(
    z.object({
      nombre: z.string().describe("Nombre del parámetro (ej. Coeficiente de constructibilidad, Altura máxima)"),
      valor: z.string().describe("Valor exacto (ej. 2.5, 9 metros, No aplica)"),
      fuente: z.string().describe("Norma o artículo que lo establece (ej. OGUC Art. 2.1.24)"),
    })
  ).describe("Lista de parámetros normativos extraídos de la respuesta"),
});

export type ParametrosTabla = z.infer<typeof ParametrosSchema>;

/**
 * Analiza la respuesta final generada y extrae los parámetros en formato estructurado
 * Solo debe usarse en modo arquitecto para respuestas que contengan métricas o exigencias numéricas.
 */
export async function extraerParametros(textoRespuesta: string): Promise<ParametrosTabla | null> {
  // Si la respuesta es muy corta, no vale la pena
  if (textoRespuesta.length < 100) return null;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ParametrosSchema,
      prompt: `Analiza la siguiente respuesta sobre normativa urbana y extrae los parámetros cuantitativos o exigencias específicas.
Si no hay parámetros técnicos claros (dimensiones, coeficientes, alturas, rasantes, exigencias de metraje, densidades), devuelve un array vacío.
Si los hay, extrae el nombre, el valor y la fuente citada.

Respuesta generada:
${textoRespuesta}`,
    });
    
    return object.parametros.length > 0 ? object : null;
  } catch (err) {
    console.error("Error extrayendo parámetros:", err);
    return null;
  }
}
