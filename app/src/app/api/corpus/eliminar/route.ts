/**
 * DELETE /api/corpus/eliminar?id=<norma_id>
 * Elimina una norma y todos sus chunks asociados.
 * Solo uso interno/admin.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();

  // Eliminar chunks primero (FK constraint)
  const { error: errChunks } = await sb
    .from("chunks")
    .delete()
    .eq("norma_id", id);

  if (errChunks) {
    return Response.json(
      { error: `Error al eliminar chunks: ${errChunks.message}` },
      { status: 500 }
    );
  }

  // Eliminar norma
  const { error: errNorma } = await sb
    .from("normas")
    .delete()
    .eq("id", id);

  if (errNorma) {
    return Response.json(
      { error: `Error al eliminar norma: ${errNorma.message}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
