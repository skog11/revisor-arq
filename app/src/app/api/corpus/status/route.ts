/**
 * GET /api/corpus/status
 * Retorna el estado actual del corpus: normas ingresadas, total chunks, última ingesta.
 * Usa SUPABASE_SERVICE_ROLE_KEY — solo para uso interno/admin.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const revalidate = 60; // cache 1 minuto

export async function GET() {
  const sb = getSupabaseServiceClient();

  const { data: normas, error } = await sb
    .from("normas")
    .select("tipo, numero, titulo, total_chunks, fecha_ingesta, fecha_actualizacion, vigente")
    .order("tipo")
    .order("numero");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { count: totalChunks } = await sb
    .from("chunks")
    .select("*", { count: "exact", head: true });

  return Response.json({
    totalChunks: totalChunks ?? 0,
    totalNormas: normas?.length ?? 0,
    normas: normas ?? [],
    timestamp: new Date().toISOString(),
  });
}
