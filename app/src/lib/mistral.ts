/**
 * mistral.ts — Cliente Mistral AI La Plateforme (API OpenAI-compatible)
 *
 * Reemplazo gratuito de Cerebras en la cadena de respaldo: Cerebras dejó de ser
 * gratuito sin tarjeta el 17/08/2026 (pasó a exigir método de pago para
 * desbloquear créditos) y en producción devolvía 402 Payment Required en cada
 * llamada — ver commit que quitó Cerebras de buildProviderChain en gemini.ts.
 *
 * El tier "Experiment" de Mistral (console.mistral.ai) sigue sin tarjeta
 * (solo verificación telefónica al registrarse): ~1B tokens/mes, acceso a
 * todos los modelos incluido Mistral Large. Se usa "mistral-large-latest"
 * (alias que Mistral mantiene apuntando al modelo grande vigente) en vez de
 * un ID con fecha fija, para no repetir el patrón de modelos deprecados que
 * ya rompió Cerebras/DeepSeek/Groq en este proyecto.
 *
 * Registrarse en https://console.mistral.ai para obtener API key gratuita.
 * Opcional: si no se define MISTRAL_API_KEY, la cadena la salta sin error.
 */

export const MODEL_MISTRAL = "mistral-large-latest";

function getApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("Falta MISTRAL_API_KEY");
  return key;
}

/**
 * Chequeo de salud para /api/healthz, en el mismo espíritu que
 * checkCerebrasHealth() en cerebras.ts: un GET liviano (sin generar texto)
 * que confirma que la clave sigue vigente. A diferencia de Cerebras, Mistral
 * es opcional — si no hay MISTRAL_API_KEY, no es una falla del servicio.
 */
export async function checkMistralHealth(): Promise<{
  ok: boolean;
  configurado: boolean;
  detalle?: string;
}> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    return { ok: true, configurado: false, detalle: "MISTRAL_API_KEY no configurada (opcional)" };
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/models", {
      headers: { "Authorization": `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { ok: false, configurado: true, detalle: `Mistral ${response.status}` };
    }
    return { ok: true, configurado: true };
  } catch (err) {
    return {
      ok: false,
      configurado: true,
      detalle: err instanceof Error ? err.message : "error desconocido",
    };
  }
}

export async function* streamMistral(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
): AsyncGenerator<string, void, unknown> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL_MISTRAL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.15,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Mistral ${response.status}: ${err.slice(0, 200)}`);
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
