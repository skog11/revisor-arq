/**
 * PATCH /api/corpus/vigencia?id=<norma_id>&vigente=true|false
 */
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id      = searchParams.get("id");
  const vigente = searchParams.get("vigente");

  if (!id || vigente === null) {
    return Response.json({ error: "Faltan parámetros id o vigente" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();
  const { error } = await sb
    .from("normas")
    .update({ vigente: vigente === "true", fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
