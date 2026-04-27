/**
 * PATCH /api/corpus/vigencia
 * Body: { id: string; vigente: boolean }
 * Actualiza el campo vigente de una norma.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  id: z.string().uuid(),
  vigente: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Se requiere id (UUID válido) y vigente (boolean)" },
      { status: 400 }
    );
  }

  const { id, vigente } = parsed.data;

  const sb = getSupabaseServiceClient();
  const { error } = await sb
    .from("normas")
    .update({ vigente, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
