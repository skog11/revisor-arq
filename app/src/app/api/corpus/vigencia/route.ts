/**
 * PATCH /api/corpus/vigencia
 * Body: { id: string; vigente: boolean }
 * Actualiza el campo vigente de una norma.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  let body: { id?: string; vigente?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { id, vigente } = body;
  if (!id || typeof vigente !== "boolean") {
    return Response.json({ error: "Se requiere id (string) y vigente (boolean)" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();
  const { error } = await sb
    .from("normas")
    .update({ vigente, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
