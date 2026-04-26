import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ContactoSchema = z.object({
  tipo: z.enum(["consulta", "soporte", "sugerencia", "otro"]),
  descripcion: z.string().min(10).max(2000),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  // Rate limiting: 10 contactos por hora por IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 10, 3_600_000);
  if (!rl.success) {
    const minutos = Math.ceil(rl.resetMs / 60_000);
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta nuevamente en ${minutos} minuto${minutos !== 1 ? "s" : ""}.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = ContactoSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { tipo, descripcion, email } = parsed.data;

  try {
    // Guardar en Supabase si está configurado
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key) {
      const sb = createClient(url, key);
      await sb.from("contacto").insert({
        tipo,
        descripcion: descripcion.trim(),
        email: email?.trim() || null,
      });
    }
  } catch {
    // Falla silenciosa — el usuario igual recibe confirmación
  }

  return NextResponse.json({ ok: true });
}
