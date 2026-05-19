import {
  GoogleGenerativeAI,
  type GenerateContentStreamResult,
} from "@google/generative-ai";
import { streamCerebras } from "@/lib/cerebras";
import { streamDeepSeek } from "@/lib/deepseek";
import { streamOpenRouter } from "@/lib/openrouter";
import { streamGroq } from "@/lib/groq";

export const MODEL_FLASH = "gemini-2.5-flash";
export const MODEL_PRO = "gemini-2.5-pro";
export const MODEL_NAME = MODEL_FLASH; // alias para backward compat

/**
 * Cadena de proveedores LLM:
 *   Cerebras (primario, gratis) → DeepSeek (si hay key) → Gemini Flash (1 retry) → OpenRouter → Groq
 *
 * DeepSeek es pay-per-use pero muy barato y de alta calidad; se incluye automáticamente
 * si DEEPSEEK_API_KEY está definida (créditos iniciales o plan activo).
 * Gemini usa maxRetries=1 para fast-fail en rate limit del free tier (15 RPM).
 * Si LLM_PRIMARY=gemini, Gemini va al frente con reintentos completos.
 */

// Reintentos para llamadas no-stream con fallback (clasificador, HyDE, multi-query)
const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 10_000;

// Reintentos para streamGemini cuando es primario:
const MAX_RETRIES_STREAM = 3;
const STREAM_RETRY_DELAY_MS = 3_000; // 3s base — backoff: 3s, 6s, 12s

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

/**
 * Convierte el stream nativo de Gemini en un async generator de texto plano,
 * para que sea intercambiable con los demás proveedores en la cadena.
 */
async function* streamGeminiNative(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
  maxRetries = MAX_RETRIES_STREAM,
): AsyncGenerator<string, void, unknown> {
  const model = getGeminiModel(systemPrompt, modelo);
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContentStream(userMessage);
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      if (attempt < maxRetries - 1) {
        const delay = jitter(STREAM_RETRY_DELAY_MS * Math.pow(2, attempt));
        console.log(`[Gemini] Error reintentable (intento ${attempt + 1}/${maxRetries}), esperando ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

/**
 * Construye la cadena de proveedores según LLM_PRIMARY.
 * - "cerebras" (default): Cerebras → DeepSeek* → Gemini (1 retry) → OpenRouter → Groq
 * - "gemini": Gemini (reintentos completos) → Cerebras → DeepSeek* → OpenRouter → Groq
 *
 * (*) DeepSeek se incluye solo si DEEPSEEK_API_KEY está definida.
 * Gemini en posición de fallback usa maxRetries=1 para fast-fail ante rate limit.
 */
function buildProviderChain(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
): Array<{ nombre: string; gen: () => AsyncGenerator<string, void, unknown> }> {
  const primary = (process.env.LLM_PRIMARY ?? "cerebras").toLowerCase();
  const geminiRetries = primary === "gemini" ? MAX_RETRIES_STREAM : 1;

  const gemini     = { nombre: "Gemini",     gen: () => streamGeminiNative(systemPrompt, userMessage, modelo, geminiRetries) };
  const cerebras   = { nombre: "Cerebras",   gen: () => streamCerebras(systemPrompt, userMessage) };
  const deepseek   = { nombre: "DeepSeek",   gen: () => streamDeepSeek(systemPrompt, userMessage) };
  const openrouter = { nombre: "OpenRouter", gen: () => streamOpenRouter(systemPrompt, userMessage) };
  const groq       = { nombre: "Groq",       gen: () => streamGroq(systemPrompt, userMessage) };

  // DeepSeek solo entra en la cadena si la API key está configurada
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;

  if (primary === "gemini") {
    return [gemini, cerebras, ...(hasDeepSeek ? [deepseek] : []), openrouter, groq];
  }
  return [cerebras, ...(hasDeepSeek ? [deepseek] : []), gemini, openrouter, groq];
}

/**
 * Stream con cadena de fallback configurable vía LLM_PRIMARY (default: "deepseek").
 *
 * Cada proveedor se prueba intentando consumir el primer chunk. Si falla antes de emitir
 * cualquier token, se pasa al siguiente. Una vez comenzado el streaming, no hay fallback
 * mid-stream (evita salidas concatenadas inconsistentes).
 */
export async function streamGemini(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
): Promise<GenerateContentStreamResult> {
  const cadena = buildProviderChain(systemPrompt, userMessage, modelo);

  const streamAsync = (async function* () {
    let lastErr: unknown;
    for (const { nombre, gen } of cadena) {
      const iter = gen();
      try {
        const first = await iter.next();
        console.log(`[LLM] Usando ${nombre}`);
        if (!first.done && first.value) {
          yield { text: () => first.value as string };
        }
        for await (const text of iter) {
          yield { text: () => text };
        }
        return;
      } catch (err) {
        lastErr = err;
        console.error(`[LLM] ${nombre} falló antes de emitir tokens:`, String(err).slice(0, 120));
      }
    }
    throw new Error(friendlyError(lastErr));
  })();

  return { stream: streamAsync } as unknown as GenerateContentStreamResult;
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

/**
 * Variante no-streaming con cadena de fallback idéntica a streamGemini.
 * Usa para clasificador, HyDE, multi-query y cualquier llamada que necesite
 * texto completo pero no stream, para que el rate limit de Gemini no bloquee el pipeline.
 */
export async function generateWithFallback(
  systemPrompt: string,
  userMessage: string,
  opts: { temperature?: number; maxOutputTokens?: number; modelo?: string } = {},
): Promise<string> {
  const cadena = buildProviderChain(systemPrompt, userMessage, opts.modelo);
  let lastErr: unknown;

  for (const { nombre, gen } of cadena) {
    try {
      let text = "";
      for await (const chunk of gen()) {
        text += chunk;
      }
      console.log(`[LLM:generate] Usando ${nombre}`);
      return text;
    } catch (err) {
      lastErr = err;
      console.error(`[LLM:generate] ${nombre} falló:`, String(err).slice(0, 120));
    }
  }
  throw new Error(friendlyError(lastErr));
}
