import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { tipo, descripcion, email } = await req.json();

    if (!tipo || !descripcion || descripcion.trim().length < 10) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

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

    return NextResponse.json({ ok: true });
  } catch {
    // Falla silenciosa — el usuario igual recibe confirmación
    return NextResponse.json({ ok: true });
  }
}
