/**
 * POST /api/admin/login
 * Body: { key: string; returnTo?: string }
 *
 * Verifica la clave de administrador, genera un JWT firmado (8h) y lo
 * establece como cookie HTTP-only. El JWT nunca expone el secreto crudo.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signAdminJwt, MAX_AGE_SECONDS } from "@/lib/admin-jwt";

const BodySchema = z.object({
  key: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Límite estricto: 5 intentos por 15 minutos por IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin_login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espere unos minutos e intente de nuevo." },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
  }

  const { key, returnTo } = parsed.data;

  if (key !== secret) {
    // Retardo mínimo para mitigar timing attacks
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  // Ruta de retorno validada: solo rutas relativas internas
  const safeReturn = returnTo?.startsWith("/") ? returnTo : "/normativa";

  const token = await signAdminJwt(secret);

  const res = NextResponse.json({ ok: true, redirectTo: safeReturn });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  return res;
}
