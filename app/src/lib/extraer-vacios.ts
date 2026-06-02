import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const VaciosSchema = z.object({
  vacios: z.array(
    z.object({
      tema: z.string().describe("Tema del vacío o contradicción normativa"),
      explicacion: z.string().describe("Explicación breve de por qué no está resuelto claramente en la norma base"),
      sugerencia: z.string().describe("Cómo suele resolverse (jurisprudencia CGR, criterios Minvu, o interpretación)"),
    })
  ).describe("Lista de vacíos normativos o áreas grises detectados en el análisis"),
});

export type VaciosTabla = z.infer<typeof VaciosSchema>;

/**
 * Analiza la respuesta en modo profundo y extrae posibles vacíos normativos
 * o contradicciones detectadas por el sistema.
 */
export async function extraerVacios(textoRespuesta: string): Promise<VaciosTabla | null> {
  if (textoRespuesta.length < 150) return null;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: VaciosSchema,
      prompt: `Analiza este informe de normativa urbana (modo profundo) y detecta explícitamente si se mencionan "vacíos normativos", "contradicciones", "áreas grises" o aspectos donde la LGUC/OGUC no son claras y requieren interpretación de Contraloría o DDU.
Si no hay vacíos detectados, devuelve un array vacío.

Informe:
${textoRespuesta}`,
    });
    
    return object.vacios.length > 0 ? object : null;
  } catch (err) {
    console.error("Error extrayendo vacíos:", err);
    return null;
  }
}
