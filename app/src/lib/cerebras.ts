/**
 * cerebras.ts — Cliente Cerebras Inference (API OpenAI-compatible)
 *
 * Segundo proveedor en la cadena de fallback: Gemini → Cerebras → OpenRouter → Groq
 * Ventaja sobre Groq: TPM mucho más alto, permite pasar más chunks al contexto.
 * Registrarse en https://cloud.cerebras.ai para obtener API key gratuita.
 */

export const MODEL_CEREBRAS = "llama-3.3-70b-instruct";

function getApiKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("Falta CEREBRAS_API_KEY");
  return key;
}

/**
 * Stream con Cerebras Inference. Retorna AsyncGenerator<string> compatible
 * con la cadena de fallback en gemini.ts.
 */
export async function* streamCerebras(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL_CEREBRAS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.15,
      max_tokens: 8192,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Cerebras ${response.status}: ${err.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content ?? "";
          if (text) yield text;
        } catch {
          // chunk malformado, ignorar
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
