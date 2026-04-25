/**
 * Middleware de Next.js.
 *
 * Protege /normativa con una clave de administrador simple.
 * La clave se configura con la variable de entorno ADMIN_SECRET.
 *
 * Acceso:
 *   - Cookie "admin_session" con valor igual a ADMIN_SECRET, O
 *   - Query param ?key=<ADMIN_SECRET> (establece la cookie y redirige limpio)
 *
 * Si ADMIN_SECRET no está definida, el acceso queda abierto (entorno dev).
 */

import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/normativa", "/corpus", "/api/corpus"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo rutas protegidas
  const esProtegida = PROTECTED.some((p) => pathname.startsWith(p));
  if (!esProtegida) return NextResponse.next();

  const secret = process.env.ADMIN_SECRET;
  // Sin secret configurado → abierto (desarrollo local)
  if (!secret) return NextResponse.next();

  // Verificar cookie de sesión
  const cookie = req.cookies.get("admin_session")?.value;
  if (cookie === secret) return NextResponse.next();

  // Verificar query param ?key=... → establecer cookie y redirigir
  const keyParam = req.nextUrl.searchParams.get("key");
  if (keyParam === secret) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set("admin_session", secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });
    return res;
  }

  // API routes → JSON 401 en lugar de HTML
  if (pathname.startsWith("/api/")) {
    return Response.json(
      { error: "No autorizado. Se requiere clave de administrador." },
      { status: 401 }
    );
  }

  // Páginas → 401 con pantalla de login minimalista
  return new NextResponse(loginHtml(req.nextUrl.pathname), {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function loginHtml(returnTo: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Acceso restringido — REVISOR ARQ</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f7f5f1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:#fff;border:1px solid #e0dbd4;border-radius:16px;padding:2rem;width:100%;max-width:360px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
    h1{font-size:1rem;font-weight:600;color:#1c1a17;margin-bottom:.25rem}
    p{font-size:.8rem;color:#7a7468;margin-bottom:1.5rem}
    input{width:100%;border:1px solid #e0dbd4;border-radius:8px;padding:.625rem .75rem;font-size:.875rem;color:#1c1a17;outline:none;background:#f7f5f1}
    input:focus{border-color:#a33f27;background:#fff}
    button{margin-top:.75rem;width:100%;background:#a33f27;color:#fff;border:none;border-radius:8px;padding:.625rem;font-size:.875rem;font-weight:500;cursor:pointer}
    button:hover{opacity:.9}
    .logo{font-size:.65rem;letter-spacing:.1em;color:#b0a898;text-transform:uppercase;margin-bottom:1rem;font-family:monospace}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">REVISOR ARQ</div>
    <h1>Acceso restringido</h1>
    <p>Panel de gestión normativa. Ingresa la clave de administrador.</p>
    <form method="get" action="${returnTo}">
      <input type="password" name="key" placeholder="Clave de administrador" autofocus autocomplete="current-password">
      <button type="submit">Ingresar</button>
    </form>
  </div>
</body>
</html>`;
}

export const config = {
  matcher: ["/normativa/:path*", "/corpus/:path*", "/api/corpus/:path*"],
};
