import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`nl:${ip}`, 3, 3_600_000);
  if (!rl.success) {
    const minutos = Math.ceil(rl.resetMs / 60_000);
    return Response.json(
      { error: `Demasiadas solicitudes. Intenta en ${minutos} minuto${minutos !== 1 ? "s" : ""}.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const email = typeof (body as Record<string, unknown>)?.email === "string"
    ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
    : "";

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: "Email inválido" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Verificar si ya existe y está activa
  const { data: existing } = await sb
    .from("newsletter_suscripciones")
    .select("id, activa")
    .eq("email", email)
    .maybeSingle();

  if (existing?.activa) {
    return Response.json({ ok: true, yaExistia: true }, { status: 409 });
  }

  // Upsert: insert o reactivar si estaba dado de baja
  const { error } = await sb
    .from("newsletter_suscripciones")
    .upsert({ email, activa: true }, { onConflict: "email" });

  if (error) {
    console.error("[newsletter/subscribe]", error.message);
    return Response.json({ error: "Error al suscribir" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
