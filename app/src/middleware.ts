/**
 * middleware.ts
 * 1. Refresca el token de sesión de Supabase en cada request.
 * 2. Protege rutas de administrador (/normativa, /corpus, /api/corpus, /admin)
 *    verificando un JWT firmado en la cookie admin_session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-server";
import { verifyAdminJwt } from "@/lib/admin-jwt";

const ADMIN_PROTECTED = ["/normativa", "/corpus", "/api/corpus", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Protección de rutas admin ────────────────────────────────────────────
  const esRutaAdmin = ADMIN_PROTECTED.some((p) => pathname.startsWith(p));
  if (esRutaAdmin) {
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Servidor mal configurado. Contacta al administrador." },
            { status: 500 }
          );
        }
        return new NextResponse("Error de configuración del servidor.", { status: 500 });
      }
      // En dev sin secret → pasar
    } else {
      const token = request.cookies.get("admin_session")?.value;
      const autorizado = token ? await verifyAdminJwt(token, secret) : false;

      if (!autorizado) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "No autorizado. Se requiere clave de administrador." },
            { status: 401 }
          );
        }
        return new NextResponse(loginHtml(pathname), {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
  }

  // ── 2. Refrescar sesión Supabase ────────────────────────────────────────────
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// ─── Login HTML para rutas admin ──────────────────────────────────────────────

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
    .err{margin-top:.75rem;font-size:.8rem;color:#c0392b;display:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">REVISOR ARQ</div>
    <h1>Acceso restringido</h1>
    <p>Panel de gestión normativa. Ingresa la clave de administrador.</p>
    <form id="f">
      <input type="password" id="k" placeholder="Clave de administrador" autofocus autocomplete="current-password">
      <button type="submit">Ingresar</button>
      <p class="err" id="e">Clave incorrecta.</p>
    </form>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit', async function(ev) {
      ev.preventDefault();
      const key = document.getElementById('k').value;
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ key, returnTo: ${JSON.stringify(returnTo)} })
      });
      if (r.ok) {
        const j = await r.json();
        window.location.href = j.redirectTo ?? '/normativa';
      } else {
        document.getElementById('e').style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
}
