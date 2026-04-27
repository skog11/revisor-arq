/**
 * GET /api/healthz
 * Health check para monitoreo de deploy (Vercel, UptimeRobot, etc.)
 * Verifica conexión a Supabase con una query mínima.
 * Sin auth requerido — es información de estado, no de datos.
 */

import { getSupabasePublic } from "@/lib/supabase";

export const revalidate = 0; // sin cache — siempre tiempo real

export async function GET() {
  const t0 = Date.now();

  // Variables de entorno críticas presentes
  const envOk = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.GEMINI_API_KEY &&
    process.env.VOYAGE_API_KEY
  );

  // Ping a Supabase
  let dbOk = false;
  let dbLatencia = 0;
  try {
    const tDb = Date.now();
    const sb = getSupabasePublic();
    const { error } = await sb.from("normas").select("id", { head: true, count: "exact" });
    dbLatencia = Date.now() - tDb;
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const latencia = Date.now() - t0;
  const estado = envOk && dbOk ? "ok" : "degraded";

  return Response.json(
    {
      status: estado,
      timestamp: new Date().toISOString(),
      latencia_ms: latencia,
      checks: {
        env: envOk ? "ok" : "missing_vars",
        db: dbOk ? "ok" : "error",
        db_latencia_ms: dbLatencia,
      },
    },
    {
      status: estado === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
