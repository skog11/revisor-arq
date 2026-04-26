/**
 * POST /api/feedback
 * Body: { consulta_id: string, thumbs: 1 | -1 }
 * Registra feedback del usuario en la tabla consultas.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const FeedbackSchema = z.object({
  consulta_id: z.string().uuid("ID de consulta inválido"),
  thumbs: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`fb:${ip}`, 30, 3_600_000);
  if (!rl.success) return Response.json({ error: "Demasiadas solicitudes" }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { consulta_id, thumbs } = parsed.data;
  const sb = getSupabaseServiceClient();

  const { error } = await sb
    .from("consultas")
    .update({ feedback_thumbs: thumbs })
    .eq("id", consulta_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
