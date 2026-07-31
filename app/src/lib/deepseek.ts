/**
 * deepseek.ts — Cliente DeepSeek (API OpenAI-compatible)
 *
 * Primer fallback en la cadena: Gemini → DeepSeek → Cerebras → OpenRouter → Groq
 * Modelo: deepseek-v4-flash — el más barato de los dos que acepta la API hoy.
 * Registrarse en https://platform.deepseek.com para obtener API key.
 *
 * ⚠️ Es el único proveedor de pago de la cadena. Si se quiere respetar a
 *    rajatabla la política de solo proveedores gratuitos, basta con no
 *    definir DEEPSEEK_API_KEY: la cadena lo salta solo.
 *
 *    2026-07-25 — "deepseek-chat" dejó de ser un nombre válido y la API
 *    respondía 400 en cada llamada. Los nombres vigentes son
 *    deepseek-v4-pro y deepseek-v4-flash.
 */

export const MODEL_DEEPSEEK = "deepseek-v4-flash";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("Falta DEEPSEEK_API_KEY");
  return key;
}

export async function* streamDeepSeek(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL_DEEPSEEK,
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
    throw new Error(`DeepSeek ${response.status}: ${err.slice(0, 200)}`);
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
