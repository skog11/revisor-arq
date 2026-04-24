/**
 * GET /api/corpus/status
 * Retorna el estado actual del corpus: normas ingresadas, total chunks, última ingesta.
 * Usa SUPABASE_SERVICE_ROLE_KEY — solo para uso interno/admin.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const revalidate = 0; // sin cache — datos en tiempo real para admin

export async function GET() {
  const sb = getSupabaseServiceClient();

  // Obtener normas base con metadatos expandidos (Fase 5)
  const { data: normas, error } = await sb
    .from("normas")
    .select("id, tipo, numero, titulo, fecha_actualizacion, created_at, vigente, dominio, subdominio, organo_emisor, jerarquia_norm, etapas_proyecto, alcance")
    .order("tipo")
    .order("numero");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Contar chunks totales
  const { count: totalChunks } = await sb
    .from("chunks")
    .select("*", { count: "exact", head: true });

  // Contar chunks por norma
  const { data: chunksPorNorma } = await sb
    .from("chunks")
    .select("norma_id");

  const conteoChunks: Record<string, number> = {};
  if (chunksPorNorma) {
    for (const row of chunksPorNorma) {
      const nid = row.norma_id as string;
      conteoChunks[nid] = (conteoChunks[nid] ?? 0) + 1;
    }
  }

  const normasEnriquecidas = (normas ?? []).map((n) => ({
    id: n.id as string,
    tipo: n.tipo as string,
    numero: n.numero as string,
    titulo: n.titulo as string,
    total_chunks: conteoChunks[n.id as string] ?? null,
    fecha_ingesta: n.created_at as string | null,
    fecha_actualizacion: n.fecha_actualizacion as string | null,
    vigente: n.vigente as boolean,
    // Fase 5: metadatos expandidos (null si aún no se ha ejecutado la migración)
    dominio: (n.dominio as string | null) ?? null,
    subdominio: (n.subdominio as string | null) ?? null,
    organo_emisor: (n.organo_emisor as string | null) ?? null,
    jerarquia_norm: (n.jerarquia_norm as string | null) ?? null,
    etapas_proyecto: (n.etapas_proyecto as string[] | null) ?? [],
    alcance: (n.alcance as string | null) ?? null,
  }));

  return Response.json({
    totalChunks: totalChunks ?? 0,
    totalNormas: normasEnriquecidas.length,
    normas: normasEnriquecidas,
    timestamp: new Date().toISOString(),
  });
}
