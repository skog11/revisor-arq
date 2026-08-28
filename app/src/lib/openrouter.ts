/**
 * openrouter.ts — Cliente OpenRouter (API OpenAI-compatible)
 *
 * Tercer proveedor en la cadena de fallback: Gemini → Cerebras → OpenRouter → Groq
 * Los modelos con sufijo ":free" no tienen costo; los límites son por día, no por minuto.
 * Registrarse en https://openrouter.ai para obtener API key gratuita.
 *
 * Prueba dos modelos gratuitos en orden antes de ceder el paso al siguiente proveedor
 * de la cadena (Groq): si el primero falla por deprecación, límite diario agotado o
 * error puntual del modelo, reintenta con el segundo usando la misma clave de API
 * (el 401 "Missing Authentication header" visto en producción el 2026-08-28 era un
 * fallo de la clave misma, no del modelo — este reintento no lo resuelve, pero cubre
 * el caso — ya ocurrido antes con Cerebras/DeepSeek/Groq — de que un modelo puntual
 * salga del catálogo mientras la clave sigue válida).
 */

const MODELOS_OPENROUTER = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "minimax/minimax-m3:free", // 1M contexto, ver https://openrouter.ai/minimax/minimax-m3
];

export const MODEL_OPENROUTER = MODELOS_OPENROUTER[0];

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  return key;
}

async function* streamOpenRouterModelo(
  modelo: string,
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
      model: modelo,
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
    throw new Error(`OpenRouter (${modelo}) ${response.status}: ${err.slice(0, 200)}`);
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

/**
 * Stream con OpenRouter. Retorna AsyncGenerator<string> compatible
 * con la cadena de fallback en gemini.ts. Prueba cada modelo de
 * MODELOS_OPENROUTER en orden hasta que uno emita al menos un token.
 */
export async function* streamOpenRouter(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  let lastErr: unknown;

  for (const modelo of MODELOS_OPENROUTER) {
    const iter = streamOpenRouterModelo(modelo, systemPrompt, userMessage);
    try {
      const first = await iter.next();
      if (!first.done && first.value) yield first.value;
      for await (const text of iter) yield text;
      return;
    } catch (err) {
      lastErr = err;
      // Un fallo de autenticación es de la clave, no del modelo: no vale la
      // pena reintentar con el siguiente modelo, pero sí seguir intentando
      // por si el error es específico de este modelo (404 deprecado, etc.).
      console.error(`[OpenRouter] ${modelo} falló:`, String(err).slice(0, 150));
    }
  }

  throw lastErr;
}
