/**
 * openrouter.ts — Cliente OpenRouter (API OpenAI-compatible)
 *
 * Penúltimo proveedor en la cadena de fallback: Mistral* → Gemini → OpenRouter → Groq
 * Los modelos con sufijo ":free" no tienen costo; los límites son por día, no por minuto.
 * Registrarse en https://openrouter.ai para obtener API key gratuita.
 *
 * ⚠️ El catálogo gratuito cambia sin aviso y una lista fija se muere sola: el
 * 2026-09-07 cayeron los dos modelos que estaban hardcodeados con horas de
 * diferencia (`meta-llama/llama-3.3-70b-instruct:free` primero y
 * `minimax/minimax-m3:free` después, ambos con 404 "This model is unavailable
 * for free. The paid version is available now"), dejando el eslabón entero
 * inservible. Por eso los modelos ya no se hardcodean: se consultan al catálogo
 * de OpenRouter en tiempo de ejecución y se filtran por precio 0, con la lista
 * fija degradada a semilla de emergencia si el catálogo no responde.
 */

/** Semilla usada solo si el catálogo no responde. Puede estar obsoleta. */
const MODELOS_SEMILLA = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "minimax/minimax-m3:free",
];

/** Cuántos modelos gratuitos probar en orden antes de ceder el paso a Groq. */
const MAX_MODELOS_A_PROBAR = 3;

/** El catálogo se cachea por instancia de lambda para no pedirlo en cada consulta. */
const TTL_CATALOGO_MS = 30 * 60 * 1000;
let cacheModelos: { modelos: string[]; expira: number } | null = null;

export const MODEL_OPENROUTER = MODELOS_SEMILLA[0];

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  return key;
}

interface ModeloCatalogo {
  id?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

/** Un modelo es gratuito solo si cobra 0 tanto por entrada como por salida. */
function esGratuito(modelo: ModeloCatalogo): boolean {
  const prompt = Number(modelo.pricing?.prompt ?? "1");
  const completion = Number(modelo.pricing?.completion ?? "1");
  return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
}

/**
 * Modelos gratuitos vigentes según el catálogo de OpenRouter, de mayor a menor
 * ventana de contexto (las respuestas de este proyecto van con 18 fuentes).
 * Ante cualquier fallo devuelve la semilla: es preferible intentar con una
 * lista vieja que saltarse el proveedor entero.
 */
async function obtenerModelosGratuitos(): Promise<string[]> {
  if (cacheModelos && cacheModelos.expira > Date.now()) return cacheModelos.modelos;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`catálogo ${response.status}`);

    const { data } = (await response.json()) as { data?: ModeloCatalogo[] };
    const modelos = (data ?? [])
      .filter((m): m is ModeloCatalogo & { id: string } => Boolean(m.id) && esGratuito(m))
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => m.id)
      .slice(0, MAX_MODELOS_A_PROBAR);

    if (modelos.length === 0) throw new Error("catálogo sin modelos gratuitos");

    cacheModelos = { modelos, expira: Date.now() + TTL_CATALOGO_MS };
    return modelos;
  } catch (err) {
    console.error("[OpenRouter] No se pudo leer el catálogo, usando semilla:", String(err).slice(0, 120));
    return MODELOS_SEMILLA;
  }
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
 * con la cadena de fallback en gemini.ts. Prueba en orden los modelos
 * gratuitos vigentes hasta que uno emita al menos un token.
 */
export async function* streamOpenRouter(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const modelos = await obtenerModelosGratuitos();
  let lastErr: unknown = new Error("OpenRouter: sin modelos gratuitos disponibles");

  for (const modelo of modelos) {
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

/** Expuesto solo para tests: limpia la caché del catálogo. */
export function _resetCacheModelos() {
  cacheModelos = null;
}
