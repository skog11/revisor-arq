/**
 * GET /api/healthz
 * Health check para monitoreo de deploy (Vercel, UptimeRobot, etc.)
 * Verifica conexión a Supabase con una query mínima, y que el proveedor
 * LLM primario (Mistral, si está configurado) sigue respondiendo.
 * Sin auth requerido — es información de estado, no de datos.
 *
 * Este chequeo existe porque el 2026-07-25 el modelo primario de entonces
 * (Cerebras) llevaba tiempo 404-eando en producción sin que nadie se
 * enterara: la cadena de respaldo lo disimulaba, sólo se notaba en la
 * latencia. `checkMistralHealth()` en lib/mistral.ts es la pieza que lo
 * detecta — no genera texto, solo confirma que la clave sigue vigente.
 *
 * 2026-08-28 — Cerebras dejó de ser gratuito sin tarjeta (pasó a exigir
 * pago) y devolvía 402 en cada llamada, tumbando el chat en producción sin
 * que este healthcheck lo reflejara (chequeaba el catálogo de modelos, que
 * seguía respondiendo 200, no la facturación). Se retira de la cadena y de
 * este chequeo; reemplazo gratuito: Mistral (opcional, ver mistral.ts).
 */

import { getSupabasePublic } from "@/lib/supabase";
import { checkMistralHealth } from "@/lib/mistral";

export const revalidate = 0; // sin cache — siempre tiempo real

export async function GET() {
  const t0 = Date.now();

  // Variables de entorno críticas presentes (MISTRAL_API_KEY es opcional,
  // no forma parte de este chequeo — su ausencia no degrada el servicio)
  const envOk = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.GEMINI_API_KEY &&
    process.env.VOYAGE_API_KEY
  );

  // Ping a Supabase y al proveedor LLM primario en paralelo
  const tDb = Date.now();
  const [dbResult, llmResult] = await Promise.allSettled([
    getSupabasePublic().from("normas").select("id", { head: true, count: "exact" }),
    checkMistralHealth(),
  ]);

  const dbLatencia = Date.now() - tDb;
  const dbOk = dbResult.status === "fulfilled" && !dbResult.value.error;

  // Sin MISTRAL_API_KEY configurada, checkMistralHealth() devuelve ok:true
  // (no es una falla, es una elección — la cadena sigue funcionando sin ella)
  const llmOk = llmResult.status === "fulfilled" && llmResult.value.ok;
  const llmDetalle =
    llmResult.status === "fulfilled" ? llmResult.value.detalle : llmResult.reason?.message;

  const latencia = Date.now() - t0;
  const estado = envOk && dbOk && llmOk ? "ok" : "degraded";

  return Response.json(
    {
      status: estado,
      timestamp: new Date().toISOString(),
      latencia_ms: latencia,
      checks: {
        env: envOk ? "ok" : "missing_vars",
        db: dbOk ? "ok" : "error",
        db_latencia_ms: dbLatencia,
        llm_primario: llmOk ? "ok" : "error",
        llm_primario_detalle: llmDetalle ?? null,
      },
    },
    {
      status: estado === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
