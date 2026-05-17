import { NextRequest } from "next/server";
import { streamDeepSeek } from "@/lib/deepseek";
import { streamCerebras } from "@/lib/cerebras";
import { streamGroq } from "@/lib/groq";
import { generateGemini } from "@/lib/gemini";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: Record<string, string> = {};

  // Test Gemini (no-streaming)
  try {
    const r = await generateGemini("Responde muy breve.", "Di solo: hola", { maxRetries: 1, maxOutputTokens: 10 });
    resultados["gemini"] = `OK: ${r.slice(0, 50)}`;
  } catch (err) {
    resultados["gemini"] = `ERROR: ${String(err).slice(0, 200)}`;
  }

  // Test streaming providers
  for (const [nombre, gen] of [
    ["deepseek", () => streamDeepSeek("Responde brevemente.", "Di solo: hola")],
    ["cerebras",  () => streamCerebras("Responde brevemente.", "Di solo: hola")],
    ["groq",      () => streamGroq("Responde brevemente.", "Di solo: hola")],
  ] as const) {
    try {
      let texto = "";
      for await (const chunk of gen()) {
        texto += chunk;
        if (texto.length > 20) break;
      }
      resultados[nombre] = texto ? `OK: ${texto.slice(0, 50)}` : "OK (vacio)";
    } catch (err) {
      resultados[nombre] = `ERROR: ${String(err).slice(0, 200)}`;
    }
  }

  // Mostrar env vars presentes (solo si tienen valor)
  resultados["env"] = [
    "DEEPSEEK_API_KEY", "CEREBRAS_API_KEY", "GROQ_API_KEY",
    "GEMINI_API_KEY", "VOYAGE_API_KEY", "LLM_PRIMARY"
  ].map(k => `${k}=${process.env[k] ? "SET" : "MISSING"}`).join(", ");

  return Response.json(resultados);
}
