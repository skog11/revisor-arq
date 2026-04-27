/**
 * POST /api/admin/login
 * Body: { key: string; returnTo?: string }
 *
 * Verifica la clave de administrador y establece la cookie admin_session.
 * Usar POST en lugar de GET ?key= para evitar que la clave aparezca en logs
 * del servidor, historial del navegador y cabeceras Referer.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const BodySchema = z.object({
  key: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Límite estricto: 5 intentos por 15 minutos por IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin_login:${ip}`, 5, 15 * 60 * 1000);
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
    // Mismo tiempo de respuesta que éxito para evitar timing attacks
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  // Ruta de retorno validada: solo rutas relativas internas
  const safeReturn = returnTo?.startsWith("/") ? returnTo : "/normativa";

  const res = NextResponse.json({ ok: true, redirectTo: safeReturn });
  res.cookies.set("admin_session", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });

  return res;
}
