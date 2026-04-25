/**
 * GET /api/stats
 * Endpoint público (sin auth) que devuelve estadísticas de la base normativa.
 * Usado en la landing page para mostrar el corpus indexado.
 * Cache: 10 minutos (no cambia en tiempo real).
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const revalidate = 600; // 10 minutos

export async function GET() {
  try {
    const sb = getSupabaseServiceClient();

    const [normasRes, chunksRes] = await Promise.all([
      sb
        .from("normas")
        .select("tipo", { count: "exact", head: false })
        .eq("vigente", true),
      sb
        .from("chunks")
        .select("id", { count: "exact", head: true }),
    ]);

    if (normasRes.error || chunksRes.error) {
      throw new Error(normasRes.error?.message ?? chunksRes.error?.message);
    }

    // Conteo por tipo
    const tipos = normasRes.data ?? [];
    const porTipo: Record<string, number> = {};
    for (const { tipo } of tipos) {
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
    }

    return NextResponse.json(
      {
        totalNormas: normasRes.count ?? tipos.length,
        totalChunks: chunksRes.count ?? 0,
        porTipo,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
        },
      }
    );
  } catch {
    // Fallback silencioso — la landing no debe romperse por esto
    return NextResponse.json(
      { totalNormas: 0, totalChunks: 0, porTipo: {}, updatedAt: null },
      { status: 200 }
    );
  }
}
