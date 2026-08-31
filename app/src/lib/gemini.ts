import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText, type LanguageModel } from "ai";
import { streamMistral } from "@/lib/mistral";
import { streamOpenRouter } from "@/lib/openrouter";
import { streamGroq } from "@/lib/groq";
import { streamOmniRoute, tieneOmniRouteConfigurado } from "@/lib/omniroute";

/**
 * 2026-08-29 — gemini-2.5-flash/-pro dejaron de estar disponibles para API keys
 * nuevas ("This model models/gemini-2.5-flash is no longer available to new
 * users"), confirmado en producción con una GEMINI_API_KEY recién creada.
 * Google recomienda gemini-3.6-flash como reemplazo directo (no existe
 * gemini-3.6-pro ni 3.5-pro; el flagship Pro vigente es gemini-3.1-pro).
 */
export const MODEL_FLASH = "gemini-3.6-flash";
export const MODEL_PRO = "gemini-3.1-pro";
export const MODEL_NAME = MODEL_FLASH; // alias para backward compat

/** Forma mínima que espera el consumidor en route.ts: stream de chunks con .text(). */
export interface StreamGeminiResult {
  stream: AsyncGenerator<{ text: () => string }, void, unknown>;
}

/**
 * Cadena de proveedores LLM:
 *   Mistral (primario, gratis si hay key) → Gemini Flash (1 retry) →
 *   OpenRouter (2 modelos, incluye MiniMax) → Groq
 *
 * 2026-08-28 — Cerebras salió de la cadena: dejó de ser gratuito sin tarjeta
 * (ver mistral.ts). Mistral lo reemplaza como primario gratuito; a diferencia
 * de Cerebras, es opcional — sin MISTRAL_API_KEY la cadena lo salta sin error.
 *
 * 2026-08-31 — DeepSeek salió de la cadena a pedido: era pay-per-use y se
 * quedaba sin saldo en producción (402 Insufficient Balance) sin que nadie
 * lo recargara. lib/deepseek.ts se borró (sin consumidores tras el cambio).
 *
 * Gemini usa maxRetries=1 para fast-fail en rate limit del free tier (15 RPM).
 * Si LLM_PRIMARY=gemini, Gemini va al frente con reintentos completos.
 */

// Reintentos para llamadas no-stream con fallback (clasificador, HyDE, multi-query)
const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 10_000;

// Reintentos para streamGemini cuando es primario:
const MAX_RETRIES_STREAM = 3;
const STREAM_RETRY_DELAY_MS = 3_000; // 3s base — backoff: 3s, 6s, 12s

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
  return apiKey;
}

/**
 * Modelo Gemini vía @ai-sdk/google — mismo SDK que ya usan extraer-parametros.ts,
 * extraer-vacios.ts, extraer-cronologia.ts, detector-calculadoras.ts y parse-doc/route.ts.
 * Reemplaza a @google/generative-ai (deprecado por Google, ver
 * https://github.com/google-gemini/deprecated-generative-ai-js): ese paquete legacy
 * dejó de recibir soporte y producía fallos de fetch genéricos e indiagnosticables
 * ("[GoogleGenerativeAI Error]: Error fetching from ...") sin exponer el código de
 * estado real, a diferencia del resto de proveedores de la cadena.
 */
function getGeminiLanguageModel(modelo?: string): LanguageModel {
  const google = createGoogleGenerativeAI({ apiKey: getApiKey() });
  return google(modelo ?? MODEL_NAME);
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
  const model = getGeminiLanguageModel(modelo);
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: userMessage,
        temperature: 0.15, // Reducido de 0.2 para más determinismo en respuestas legales
        topP: 0.9,
        maxOutputTokens: 8192, // Aumentado de 4096 para respuestas profundas
        maxRetries: 0, // el reintento con backoff lo maneja este loop, no el SDK
      });
      for await (const text of result.textStream) {
        yield text;
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
 * - default: Mistral* → Gemini (1 retry) → OpenRouter → Groq
 * - "gemini": Gemini (reintentos completos) → Mistral* → OpenRouter → Groq
 *
 * (*) Mistral se incluye solo si su API key está definida.
 * Gemini en posición de fallback usa maxRetries=1 para fast-fail ante rate limit.
 */
function buildProviderChain(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
): Array<{ nombre: string; gen: () => AsyncGenerator<string, void, unknown> }> {
  const primary = (process.env.LLM_PRIMARY ?? "mistral").toLowerCase();
  const geminiRetries = primary === "gemini" ? MAX_RETRIES_STREAM : 1;
  // Reserva amplia solo para informes profundos. El resto de las consultas
  // gana capacidad y estabilidad con un límite suficiente de 3k tokens.
  const presupuestoSalida = modelo === MODEL_PRO ? 8192 : 3072;

  const gemini     = { nombre: "Gemini",     gen: () => streamGeminiNative(systemPrompt, userMessage, modelo, geminiRetries) };
  const mistral    = { nombre: "Mistral",    gen: () => streamMistral(systemPrompt, userMessage, presupuestoSalida) };
  const openrouter = { nombre: "OpenRouter", gen: () => streamOpenRouter(systemPrompt, userMessage) };
  const groq       = { nombre: "Groq",       gen: () => streamGroq(systemPrompt, userMessage) };
  const omniroute  = { nombre: "OmniRoute",  gen: () => streamOmniRoute(systemPrompt, userMessage) };

  // Mistral solo entra a la cadena si su clave está configurada
  const hasMistral = !!process.env.MISTRAL_API_KEY;

  if (primary === "gemini") {
    return [
      ...(tieneOmniRouteConfigurado() ? [omniroute] : []),
      gemini, ...(hasMistral ? [mistral] : []), openrouter, groq,
    ];
  }
  return [
    ...(tieneOmniRouteConfigurado() ? [omniroute] : []),
    ...(hasMistral ? [mistral] : []), gemini, openrouter, groq,
  ];
}

/**
 * Stream con cadena de fallback configurable vía LLM_PRIMARY (default: "mistral").
 *
 * Cada proveedor se prueba intentando consumir el primer chunk. Si falla antes de emitir
 * cualquier token, se pasa al siguiente. Una vez comenzado el streaming, no hay fallback
 * mid-stream (evita salidas concatenadas inconsistentes).
 */
export async function streamGemini(
  systemPrompt: string,
  userMessage: string,
  modelo?: string,
): Promise<StreamGeminiResult> {
  const cadena = buildProviderChain(systemPrompt, userMessage, modelo);

  const streamAsync = (async function* () {
    let lastErr: unknown;
    for (const { nombre, gen } of cadena) {
      const iter = gen();
      try {
        const first = await iter.next();
        if (first.done) {
          // El proveedor no lanzó error, pero tampoco emitió ni un token
          // (stream vacío — p.ej. un modelo :free devolviendo un completion
          // filtrado o vacío sin marcarlo como error HTTP). Sin este chequeo
          // la cadena lo daba por exitoso y devolvía una respuesta vacía en
          // vez de probar el siguiente proveedor.
          lastErr = new Error(`${nombre} no emitió contenido`);
          console.error(`[LLM] ${nombre} devolvió una respuesta vacía, probando siguiente proveedor`);
          continue;
        }
        console.log(`[LLM] Usando ${nombre}`);
        yield { text: () => first.value as string };
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

  return { stream: streamAsync };
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
  const model = getGeminiLanguageModel(opts.modelo);
  let lastErr: unknown;
  const retries = opts.maxRetries ?? MAX_RETRIES;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userMessage,
        temperature: opts.temperature ?? 0.15,
        topP: 0.9,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        maxRetries: 0, // el reintento con backoff lo maneja este loop, no el SDK
      });
      return result.text;
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
      if (!text.trim()) {
        // Mismo caso que en streamGemini: sin error pero sin contenido —
        // no devolver un string vacío como si fuera una respuesta válida
        // (rompía JSON.parse en clasificador.ts con "Unexpected end of
        // JSON input"), probar el siguiente proveedor de la cadena.
        lastErr = new Error(`${nombre} no emitió contenido`);
        console.error(`[LLM:generate] ${nombre} devolvió una respuesta vacía, probando siguiente proveedor`);
        continue;
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
