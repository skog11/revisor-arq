import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const CalculadoraSchema = z.object({
  tipo: z.enum(["constructibilidad", "estacionamientos", "ninguna"]).describe("Tipo de calculadora interactiva sugerida para acompañar la respuesta"),
});

/**
 * Analiza la pregunta del usuario para determinar si se beneficiaría
 * de un widget de calculadora interactiva.
 */
export async function detectarCalculadora(preguntaUsuario: string): Promise<"constructibilidad" | "estacionamientos" | null> {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CalculadoraSchema,
      prompt: `Analiza la siguiente pregunta de un usuario sobre normativa urbana y determina si está consultando sobre cómo calcular o aplicar el "coeficiente de constructibilidad" (o superficie edificable) o el cálculo de "estacionamientos".
Si se beneficiaría de tener una calculadora interactiva junto a la respuesta teórica, devuelve el tipo. De lo contrario, devuelve "ninguna".

Pregunta:
${preguntaUsuario}`,
    });
    
    return object.tipo !== "ninguna" ? object.tipo : null;
  } catch (err) {
    console.error("Error detectando calculadora:", err);
    return null;
  }
}
