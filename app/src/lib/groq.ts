import Groq from "groq-sdk";

/**
 * ⚠️ Groq deprecó llama-3.3-70b-versatile el 17/06/2026 (aplica a free/developer
 * tier; solo enterprise con contrato de spend comprometido seguía con acceso).
 * La API respondía 404 en cada llamada, disimulado por la cadena de fallback —
 * mismo patrón que el incidente de Cerebras/DeepSeek del 2026-07-25 (ver
 * cerebras.ts). Reemplazo recomendado por Groq: openai/gpt-oss-120b.
 * Verificar catálogo vigente en https://console.groq.com/docs/models antes de
 * asumir que este modelo sigue vivo.
 */
export const MODEL_GROQ = "openai/gpt-oss-120b";

const MAX_RETRIES_STREAM = 3;
const STREAM_RETRY_DELAY_MS = 4_000; // 4s base — backoff: 4s, 8s

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Falta GROQ_API_KEY");
  return new Groq({ apiKey });
}

function isRetryable(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("503") ||
    msg.includes("529") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("rate_limit") ||
    msg.includes("timeout")
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.5; // ±0-50% del delay base
}

/**
 * Stream con Groq. Retorna AsyncIterableIterator<string> compatible con el consumer
 * que espera el patrón de GenerateContentStreamResult de Gemini.
 *
 * Groq es ultrarrápido pero el free tier de openai/gpt-oss-120b tiene apenas
 * 8.000 TPM (tokens por minuto, entrada+salida combinadas) — ver
 * console.groq.com/docs/rate-limits. Una consulta típica de este proyecto ya
 * usa ~7-8.6k tokens solo de entrada (18 chunks + system prompt, ver comentario
 * de MAX_CHUNKS en retriever.ts), así que pedir 8192 de salida garantizaba un
 * 413 "Request too large" — visto en producción el 2026-08-29 apenas Groq
 * empezó a recibir tráfico real (antes moría con 404 por el modelo deprecado,
 * así que este límite nunca se había puesto a prueba).
 *
 * 2026-09-07 — la entrada ahora llega recortada (compactar-contexto.ts), lo que
 * dejó espacio para subir la salida, y hacía falta: gpt-oss-120b es un modelo
 * de razonamiento y con `reasoning_effort` en su default ("medium") gastaba los
 * 1.024 tokens razonando, cerrando el stream sin emitir un solo token de
 * contenido. En los logs se veía como "Groq devolvió una respuesta vacía" justo
 * después de arreglar el 413. Se baja el esfuerzo de razonamiento, se oculta su
 * salida y se sube el presupuesto a 3.000 tokens, que con la entrada compactada
 * sigue cómodo dentro de los 8.000 TPM.
 *
 * Diseñado como último fallback cuando el resto de la cadena falla.
 */
export async function* streamGroq(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 3000,
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES_STREAM; attempt++) {
    try {
      const stream = await client.chat.completions.create({
        model: MODEL_GROQ,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.15,
        max_tokens: maxTokens,
        // Sin esto, el razonamiento se come el presupuesto y el stream cierra vacío.
        reasoning_effort: "low",
        reasoning_format: "hidden",
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          yield text;
        }
      }
      return; // success
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES_STREAM - 1) break;
      await sleep(jitter(STREAM_RETRY_DELAY_MS * Math.pow(2, attempt))); // backoff: ~4s, ~8s
    }
  }

  throw new Error(`Groq fallback failed: ${String(lastErr).slice(0, 200)}`);
}
