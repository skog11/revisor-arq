import {
  GoogleGenerativeAI,
  type GenerateContentStreamResult,
} from "@google/generative-ai";

export const MODEL_FLASH = "gemini-2.5-flash";
export const MODEL_PRO = "gemini-2.5-pro";
export const MODEL_NAME = MODEL_FLASH; // alias para backward compat

// Reintentos para errores transitorios de Gemini (503, 429, etc.)
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 8_000; // 8s base — backoff: 8s, 16s, 32s, 64s

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Crea el modelo Gemini con un system instruction opcional.
 * Usar systemInstruction en lugar de concatenar al mensaje del usuario
 * permite que Gemini trate las instrucciones del sistema con mayor autoridad
 * y genere respuestas más precisas y consistentes.
 */
export function getGeminiModel(systemInstruction?: string, modelo?: string) {
  const config: Parameters<ReturnType<typeof getClient>["getGenerativeModel"]>[0] = {
    model: modelo ?? MODEL_NAME,
    generationConfig: {
      temperature: 0.15, // Reducido de 0.2 para más determinismo en respuestas legales
      topP: 0.9,
      maxOutputTokens: 8192, // Aumentado de 4096 para respuestas profundas
    },
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  return getClient().getGenerativeModel(config);
}

function isRetryable(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("503") ||
    msg.includes("529") ||
    msg.includes("429") ||
    msg.includes("Service Unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand")
  );
}

function friendlyError(err: unknown): string {
  const msg = String(err);
  if (msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("high demand") || msg.includes("overloaded")) {
    return "El servicio de inteligencia artificial está con alta demanda en este momento. Por favor intente de nuevo en unos segundos.";
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate")) {
    return "Se alcanzó el límite de consultas por minuto. Por favor espere unos segundos e intente de nuevo.";
  }
  if (msg.includes("GEMINI_API_KEY") || msg.includes("API key")) {
    return "Error de configuración del servicio. Contacte al administrador.";
  }
  return "Ocurrió un error al generar la respuesta. Por favor intente de nuevo.";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jitter aleatorio para evitar que múltiples llamadas concurrentes reintenten al mismo tiempo */
function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.5; // ±0-50% del delay base
}

export async function streamGemini(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
): Promise<GenerateContentStreamResult> {
  // Usar systemInstruction para una separación clara de roles
  const model = getGeminiModel(systemPrompt, modelo);
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await model.generateContentStream(userMessage);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES - 1) break;
      await sleep(jitter(RETRY_DELAY_MS * Math.pow(2, attempt))); // backoff con jitter: ~8s, ~16s, ~32s
    }
  }

  throw new Error(friendlyError(lastErr));
}

export async function generateGemini(
  systemPrompt: string,
  userMessage: string,
  opts: {
    temperature?: number;
    maxOutputTokens?: number;
    modelo?: string;
    /**
     * Número máximo de reintentos ante errores transitorios (429, 503).
     * Por defecto usa MAX_RETRIES (4).
     * Usar 1 para llamadas con fallback (clasificador, HyDE, multi-query)
     * para evitar que los backoffs consuman el timeout de la función serverless.
     */
    maxRetries?: number;
  } = {},
): Promise<string> {
  const model = opts.temperature !== undefined || opts.maxOutputTokens !== undefined
    ? getClient().getGenerativeModel({
        model: opts.modelo ?? MODEL_NAME,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: opts.temperature ?? 0.15,
          topP: 0.9,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
        },
      })
    : getGeminiModel(systemPrompt, opts.modelo);
  let lastErr: unknown;
  const retries = opts.maxRetries ?? MAX_RETRIES;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await model.generateContent(userMessage);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === retries - 1) break;
      await sleep(jitter(RETRY_DELAY_MS * Math.pow(2, attempt))); // backoff con jitter: ~8s, ~16s, ~32s
    }
  }

  throw new Error(friendlyError(lastErr));
}
