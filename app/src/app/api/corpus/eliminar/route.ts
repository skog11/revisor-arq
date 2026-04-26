/**
 * DELETE /api/corpus/eliminar
 * Body: { id: string }
 * Elimina la norma y todos sus chunks de Supabase.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ id: z.string().uuid() });

export async function DELETE(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "El campo id debe ser un UUID válido" }, { status: 400 });
  }

  const { id } = parsed.data;

  const sb = getSupabaseServiceClient();

  // Eliminar chunks primero (FK constraint)
  const { error: chunksErr } = await sb.from("chunks").delete().eq("norma_id", id);
  if (chunksErr) return Response.json({ error: chunksErr.message }, { status: 500 });

  // Eliminar norma
  const { error: normaErr } = await sb.from("normas").delete().eq("id", id);
  if (normaErr) return Response.json({ error: normaErr.message }, { status: 500 });

  return Response.json({ ok: true });
}
