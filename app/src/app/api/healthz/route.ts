/**
 * GET /api/healthz
 * Health check para monitoreo de deploy (Vercel, UptimeRobot, etc.)
 * Verifica conexión a Supabase con una query mínima, y que el proveedor
 * LLM primario (Cerebras) sigue respondiendo con el modelo configurado.
 * Sin auth requerido — es información de estado, no de datos.
 *
 * El chequeo de Cerebras existe porque el 2026-07-25 el modelo primario
 * llevaba tiempo 404-eando en producción sin que nadie se enterara: la
 * cadena de respaldo (Gemini free tier) lo disimulaba, sólo se notaba en
 * la latencia. `checkCerebrasHealth()` en lib/cerebras.ts es la pieza que
 * lo detecta — no genera texto, solo confirma que el modelo sigue en el
 * catálogo de Cerebras.
 */

import { getSupabasePublic } from "@/lib/supabase";
import { checkCerebrasHealth } from "@/lib/cerebras";

export const revalidate = 0; // sin cache — siempre tiempo real

export async function GET() {
  const t0 = Date.now();

  // Variables de entorno críticas presentes
  const envOk = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.GEMINI_API_KEY &&
    process.env.VOYAGE_API_KEY &&
    process.env.CEREBRAS_API_KEY
  );

  // Ping a Supabase y al proveedor LLM primario en paralelo
  const tDb = Date.now();
  const [dbResult, llmResult] = await Promise.allSettled([
    getSupabasePublic().from("normas").select("id", { head: true, count: "exact" }),
    checkCerebrasHealth(),
  ]);

  const dbLatencia = Date.now() - tDb;
  const dbOk = dbResult.status === "fulfilled" && !dbResult.value.error;

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
