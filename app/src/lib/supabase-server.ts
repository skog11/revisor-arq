/**
 * supabase-server.ts
 * Clientes Supabase para Next.js App Router con soporte de cookies (SSR).
 *
 * Usar en Server Components, Route Handlers y Server Actions.
 * NO usar en Client Components — usar supabase-browser.ts para eso.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anonKey };
}

/**
 * Cliente Supabase para Server Components / Route Handlers.
 * Lee y escribe cookies de la request actual.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // En Server Components no se pueden setear cookies
          // Solo importa en middleware y route handlers
        }
      },
    },
  });
}

/**
 * Cliente Supabase para middleware de Next.js.
 * Actualiza tokens automáticamente en cada request.
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}

/**
 * Obtiene el usuario autenticado desde el servidor.
 * Retorna null si no está autenticado.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
