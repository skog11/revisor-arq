import { generateGemini, streamGemini, MODEL_FLASH, MODEL_PRO } from "./gemini";
import { MODEL_GROQ } from "./groq";

/**
 * Configuración de failover entre Google AI Studio y Groq
 *
 * Flujo:
 * 1. Intenta Google AI Studio (GEMINI_API_KEY)
 * 2. Si 429/quota, intenta Groq (GROQ_API_KEY) con modelo actual (ver groq.ts)
 * 3. Si ambas fallan, lanza error al usuario
 */

/**
 * Detecta si un error es de cuota (429)
 */
function isQuotaError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("Please retry")
  );
}

/**
 * Intenta llamada con fallback a Groq si Google falla por cuota
 */
async function generateGeminiWithFallback(
  systemPrompt: string,
  userMessage: string,
  opts: { temperature?: number; maxOutputTokens?: number; modelo?: string } = {},
  lastErr?: unknown
): Promise<string> {
  // Variable para error de cuota
  let geminiErr: unknown | undefined;

  // Intento 1: Google AI Studio
  try {
    return await generateGemini(systemPrompt, userMessage, opts as any);
  } catch (err) {
    if (!isQuotaError(err)) {
      // Error diferente a cuota → reintentar con backoff normal
      throw err;
    }
    // Guardar error de cuota para fallback
    geminiErr = err;
  }

  // Intento 2: Groq (fallback)
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("No hay GROQ_API_KEY configurada para fallback");
    }

    // Groq SDK oficial con tipado completo
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: groqApiKey });

    // Usar modelo Groq actual (actualizado dinámicamente en groq.ts)
    const response = await client.chat.completions.create({
      model: MODEL_GROQ,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: opts.temperature ?? 0.15,
      max_tokens: opts.maxOutputTokens ?? 8192,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (groqErr) {
    // Ambas APIs fallaron
    const combinedErr = new Error(
      "Ambas APIs fallaron: " +
        (isQuotaError(geminiErr) ? "límite de cuota alcanzado" : "") +
        (isQuotaError(groqErr) ? " + Groq también saturado" : "")
    );
    (combinedErr as any).cause = { gemini: geminiErr, groq: groqErr };
    throw combinedErr;
  }
}

/**
 * Versión para stream (solo para Google, Groq no soporta streaming)
 */
async function streamGeminiWithFallback(
  systemPrompt: string,
  userMessage: string,
  opts: { temperature?: number; maxOutputTokens?: number; modelo?: string } = {},
  lastErr?: unknown
): Promise<any> {
  // Variable para error de cuota
  let geminiErr: unknown | undefined;

  // Solo Google soporta streaming, Groq usa chunks normales
  try {
    return await streamGemini(systemPrompt, userMessage, opts as any);
  } catch (err) {
    if (!isQuotaError(err)) {
      throw err;
    }
    // Guardar error de cuota para fallback
    geminiErr = err;
    // Para streaming, fallback a texto completo con Groq
    const text = await generateGeminiWithFallback(systemPrompt, userMessage, opts, geminiErr);
    // Devolver stream simulado con texto completo
    const result = {
      response: {
        usageMetadata: {
          totalTokens: text.length,
          promptTokenCount: text.length * 0.5,
          candidatesTokenCount: text.length * 0.5,
        },
        candidates: [{ content: { parts: [{ text }] } }],
      },
    };
    return result;
  }
}

export {
  generateGeminiWithFallback,
  streamGeminiWithFallback,
  isQuotaError,
};
