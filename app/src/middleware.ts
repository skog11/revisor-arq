/**
 * middleware.ts
 * Refresca el token de sesión de Supabase en cada request.
 * Necesario para que el cliente SSR pueda leer/escribir cookies correctamente.
 */

import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Crear cliente de middleware y refrescar sesión
  const supabase = createMiddlewareClient(request, response);
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto:
     * - _next/static (assets estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico
     * - archivos de imágenes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
