import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return Response.json({ error: "Token inválido" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { error } = await sb
    .from("newsletter_suscripciones")
    .update({ activa: false })
    .eq("id", token);

  if (error) {
    console.error("[newsletter/unsubscribe]", error.message);
    return Response.json({ error: "Error al desuscribir" }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/?unsub=1", req.nextUrl.origin));
}
