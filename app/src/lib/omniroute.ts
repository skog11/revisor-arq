/**
 * Gateway opcional OmniRoute (API compatible con OpenAI).
 *
 * Se mantiene desactivado mientras OMNIROUTE_BASE_URL no esté configurada.
 * La instancia debe ser privada: las consultas pueden contener antecedentes
 * normativos o datos de proyectos que no deben enviarse a un gateway público.
 */

function configuracion() {
  const baseUrl = process.env.OMNIROUTE_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Falta OMNIROUTE_BASE_URL");
  return {
    baseUrl,
    apiKey: process.env.OMNIROUTE_API_KEY,
    model: process.env.OMNIROUTE_MODEL ?? "auto/offline",
  };
}

export function tieneOmniRouteConfigurado(): boolean {
  return Boolean(process.env.OMNIROUTE_BASE_URL);
}

export async function* streamOmniRoute(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const { baseUrl, apiKey, model } = configuracion();
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 8192,
      stream: true,
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) {
    const detalle = await response.text().catch(() => response.statusText);
    throw new Error(`OmniRoute ${response.status}: ${detalle.slice(0, 200)}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("OmniRoute no devolvió un stream");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
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
        } catch { /* ignorar fragmentos SSE incompletos */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
