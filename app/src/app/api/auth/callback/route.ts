/**
 * GET /api/auth/callback
 * Maneja el redirect de confirmación de email y OAuth de Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En caso de error, redirigir al login con mensaje
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
