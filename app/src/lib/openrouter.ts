/**
 * openrouter.ts — Cliente OpenRouter (API OpenAI-compatible)
 *
 * Tercer proveedor en la cadena de fallback: Gemini → Cerebras → OpenRouter → Groq
 * Los modelos con sufijo ":free" no tienen costo; los límites son por día, no por minuto.
 * Registrarse en https://openrouter.ai para obtener API key gratuita.
 */

export const MODEL_OPENROUTER = "meta-llama/llama-3.3-70b-instruct:free";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  return key;
}

/**
 * Stream con OpenRouter. Retorna AsyncGenerator<string> compatible
 * con la cadena de fallback en gemini.ts.
 */
export async function* streamOpenRouter(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
      "HTTP-Referer": "https://revisor-arq.vercel.app",
      "X-Title": "Revisor ARQ",
    },
    body: JSON.stringify({
      model: MODEL_OPENROUTER,
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
    throw new Error(`OpenRouter ${response.status}: ${err.slice(0, 200)}`);
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
