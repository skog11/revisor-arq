import Groq from "groq-sdk";

export const MODEL_GROQ = "llama-3.3-70b-versatile";

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
 * Groq es ultrarrápido pero tiene límite de 30 RPM en free tier.
 * Diseñado como fallback cuando Gemini falla por rate limit.
 */
export async function* streamGroq(
  systemPrompt: string,
  userMessage: string,
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
        max_tokens: 8192,
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
