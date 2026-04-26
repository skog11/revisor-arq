/**
 * GET /api/corpus/status
 * Retorna el estado actual del corpus: normas ingresadas, total chunks, última ingesta.
 * Requiere cookie admin_session (protegido por middleware).
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export const revalidate = 0; // sin cache — datos en tiempo real para admin

export async function GET() {
  const sb = getSupabaseServiceClient();

  // Obtener normas con metadatos expandidos
  const { data: normas, error: normasErr } = await sb
    .from("normas")
    .select(
      "id, tipo, numero, titulo, fecha_actualizacion, created_at, vigente, " +
      "dominio, subdominio, organo_emisor, jerarquia_norm, etapas_proyecto, alcance"
    )
    .order("tipo")
    .order("numero");

  if (normasErr) return Response.json({ error: normasErr.message }, { status: 500 });

  // Total de chunks (count sin traer filas)
  const { count: totalChunks, error: chunksErr } = await sb
    .from("chunks")
    .select("*", { count: "exact", head: true });

  if (chunksErr) return Response.json({ error: chunksErr.message }, { status: 500 });

  // Chunks por norma — usar RPC agregado para evitar traer miles de filas
  // Requiere: scripts/migration-rpc-count-chunks.sql ejecutado en Supabase
  const conteoChunks: Record<string, number> = {};
  const { data: rpcRows, error: rpcErr } = await sb.rpc("count_chunks_por_norma" as never);

  if (!rpcErr && rpcRows) {
    for (const row of rpcRows as { norma_id: string; total: number }[]) {
      conteoChunks[row.norma_id] = Number(row.total);
    }
  } else {
    // Fallback: traer solo norma_id si el RPC no está disponible
    const { data: chunkRows } = await sb.from("chunks").select("norma_id");
    for (const row of chunkRows ?? []) {
      const nid = (row as { norma_id: string }).norma_id;
      conteoChunks[nid] = (conteoChunks[nid] ?? 0) + 1;
    }
  }

  const normasData = (normas ?? []) as unknown as Array<Record<string, unknown>>;

  const normasEnriquecidas = normasData.map((n) => ({
    id:                  n.id                  as string,
    tipo:                n.tipo                as string,
    numero:              n.numero              as string,
    titulo:              n.titulo              as string,
    total_chunks:        conteoChunks[n.id as string] ?? null,
    fecha_ingesta:       n.created_at          as string | null,
    fecha_actualizacion: n.fecha_actualizacion as string | null,
    vigente:             n.vigente             as boolean,
    dominio:             (n.dominio            as string | null) ?? null,
    subdominio:          (n.subdominio         as string | null) ?? null,
    organo_emisor:       (n.organo_emisor      as string | null) ?? null,
    jerarquia_norm:      (n.jerarquia_norm     as string | null) ?? null,
    etapas_proyecto:     (n.etapas_proyecto    as string[] | null) ?? [],
    alcance:             (n.alcance            as string | null) ?? null,
  }));

  return Response.json({
    totalChunks:  totalChunks ?? 0,
    totalNormas:  normasEnriquecidas.length,
    normas:       normasEnriquecidas,
    timestamp:    new Date().toISOString(),
  });
}
