import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const CronologiaSchema = z.object({
  eventos: z.array(
    z.object({
      anio: z.string().describe("Año del evento o modificación (ej. 2016)"),
      norma: z.string().describe("Norma, ley o circular (ej. Ley 20.958 o DDU 316)"),
      hito: z.string().describe("Descripción del cambio o hito relevante"),
    })
  ).describe("Línea de tiempo de la evolución normativa mencionada"),
});

export type CronologiaTabla = z.infer<typeof CronologiaSchema>;

/**
 * Analiza la respuesta en modo profundo y extrae la evolución normativa en formato cronológico.
 */
export async function extraerCronologia(textoRespuesta: string): Promise<CronologiaTabla | null> {
  if (textoRespuesta.length < 150) return null;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CronologiaSchema,
      prompt: `Analiza este informe de normativa urbana y extrae la línea de tiempo o evolución normativa si es que se mencionan diferentes leyes, decretos o circulares a lo largo de los años.
Si la respuesta no menciona una evolución temporal o modificaciones históricas, devuelve un array vacío.
Ordena los eventos del más antiguo al más reciente.

Informe:
${textoRespuesta}`,
    });
    
    return object.eventos.length > 0 ? object : null;
  } catch (err) {
    console.error("Error extrayendo cronología:", err);
    return null;
  }
}
