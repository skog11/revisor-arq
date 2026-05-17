import { NextRequest } from "next/server";
import { streamDeepSeek } from "@/lib/deepseek";
import { streamCerebras } from "@/lib/cerebras";
import { streamGroq } from "@/lib/groq";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: Record<string, string> = {};

  for (const [nombre, gen] of [
    ["deepseek", () => streamDeepSeek("Eres un asistente.", "Di solo: hola")],
    ["cerebras",  () => streamCerebras("Eres un asistente.", "Di solo: hola")],
    ["groq",      () => streamGroq("Eres un asistente.", "Di solo: hola")],
  ] as const) {
    try {
      let texto = "";
      for await (const chunk of gen()) {
        texto += chunk;
        if (texto.length > 20) break;
      }
      resultados[nombre] = texto ? `OK: ${texto.slice(0, 50)}` : "OK (vacío)";
    } catch (err) {
      resultados[nombre] = `ERROR: ${String(err).slice(0, 200)}`;
    }
  }

  return Response.json(resultados);
}
