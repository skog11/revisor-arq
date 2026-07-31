/**
 * cerebras.ts — Cliente Cerebras Inference (API OpenAI-compatible)
 *
 * Proveedor PRIMARIO en la cadena: Cerebras → Gemini → OpenRouter → Groq
 * Modelo: gpt-oss-120b — 120B parámetros, ~3000 tokens/s.
 * Ventajas: hardware dedicado Cerebras CS-3, latencia muy baja, sin límite de RPM agresivo.
 * Registrarse en https://cloud.cerebras.ai para obtener API key gratuita.
 *
 * ⚠️ El catálogo de Cerebras cambia. Verificar en
 *    https://inference-docs.cerebras.ai/models/overview antes de asumir
 *    que un modelo sigue vivo.
 *
 *    2026-07-25 — qwen-3-235b-a22b-instruct-2507 salió del catálogo y la API
 *    respondía 404 en cada llamada. La cadena de respaldo lo disimuló: todo
 *    caía a Gemini (15 RPM), que con ~4 llamadas por consulta se agotaba a la
 *    tercera pregunta. Se cambió a gpt-oss-120b, el único que Cerebras marca
 *    como apto para producción. Los otros del catálogo son de evaluación y
 *    zai-glm-4.7 se da de baja el 2026-08-17.
 */

export const MODEL_CEREBRAS = "gpt-oss-120b";

function getApiKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("Falta CEREBRAS_API_KEY");
  return key;
}

/**
 * Chequeo de salud del proveedor primario, para /api/healthz.
 *
 * No genera texto (eso costaría tokens y sería lento) — usa GET /v1/models,
 * que confirma dos cosas a la vez: que la API key sigue vigente y que
 * MODEL_CEREBRAS sigue en el catálogo. Esto último es exactamente lo que
 * habría detectado el incidente del 2026-07-25 el mismo día: el modelo
 * salió del catálogo, la API empezó a responder 404 en cada llamada de
 * generación, y nadie se enteró porque la cadena de respaldo lo disimuló.
 */
export async function checkCerebrasHealth(): Promise<{
  ok: boolean;
  modeloDisponible: boolean;
  detalle?: string;
}> {
  let key: string;
  try {
    key = getApiKey();
  } catch {
    return { ok: false, modeloDisponible: false, detalle: "Falta CEREBRAS_API_KEY" };
  }

  try {
    const response = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { "Authorization": `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        ok: false,
        modeloDisponible: false,
        detalle: `Cerebras ${response.status}`,
      };
    }

    const data = await response.json();
    const ids: string[] = (data?.data ?? []).map((m: { id: string }) => m.id);
    const modeloDisponible = ids.includes(MODEL_CEREBRAS);

    return {
      ok: modeloDisponible,
      modeloDisponible,
      detalle: modeloDisponible
        ? undefined
        : `${MODEL_CEREBRAS} no está en el catálogo actual (${ids.join(", ") || "catálogo vacío"})`,
    };
  } catch (err) {
    return {
      ok: false,
      modeloDisponible: false,
      detalle: err instanceof Error ? err.message : "error desconocido",
    };
  }
}

/**
 * Stream con Cerebras Inference. Retorna AsyncGenerator<string> compatible
 * con la cadena de fallback en gemini.ts.
 */
export async function* streamCerebras(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
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
      // Cerebras contabiliza el presupuesto solicitado para sus límites por
      // minuto. Una respuesta estándar no necesita reservar 8k tokens; el
      // llamador conserva ese máximo únicamente para modo profundo.
      max_tokens: maxTokens,
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
