/**
 * POST /api/chat
 * Body: { pregunta: string, modo: "arquitecto" | "abogado" }
 * Responde con un ReadableStream (text/event-stream) de Server-Sent Events.
 *
 * Eventos SSE:
 *   data: {"type":"chunk","text":"..."}   — fragmento de texto generado
 *   data: {"type":"fuentes","data":[...]} — chunks RAG usados (enviado al inicio)
 *   data: {"type":"done"}                — fin del stream
 *   data: {"type":"meta","consultaId":"..."} — ID de consulta guardada (para feedback)
 *   data: {"type":"error","message":"..."} — error
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  recuperarChunks,
  construirContexto,
  buildSystemPrompt,
  guardarConsulta,
  detectarFueraDominio,
  validarRespuesta,
  type ModoRespuesta,
} from "@/lib/rag";
import { streamGemini, MODEL_NAME } from "@/lib/gemini";

// ─── Validación ───────────────────────────────────────────────────────────────

const ChatSchema = z.object({
  pregunta: z.string().min(5, "La pregunta es muy corta").max(2000, "Pregunta demasiado larga"),
  modo: z.enum(["arquitecto", "abogado", "profundo"]).default("arquitecto"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("JSON inválido");
  }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return errorResponse(issues[0]?.message ?? "Datos inválidos");
  }

  const { pregunta, modo } = parsed.data;

  // Crear stream SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // 0. Guardrail: detectar pregunta fuera de dominio
        const rechazoDominio = detectarFueraDominio(pregunta);
        if (rechazoDominio) {
          send({ type: "fuentes", data: [] });
          send({ type: "chunk", text: rechazoDominio });
          send({ type: "done" });
          controller.close();
          return;
        }

        // 1. Recuperar chunks relevantes (modo profundo = más contexto)
        const matchCount = modo === "profundo" ? 14 : 8;
        const chunks = await recuperarChunks(pregunta, {
          matchCount,
          soloVigentes: true,
        });

        // 2. Enviar fuentes al cliente (antes de generar)
        send({
          type: "fuentes",
          data: chunks.map((c) => ({
            norma: `${c.norma_tipo} ${c.norma_numero}`,
            articulo: c.articulo,
            norma_titulo: c.norma_titulo,
            jerarquia: c.jerarquia,
            url_fuente: c.url_fuente,
            similarity: Math.round(c.similarity * 1000) / 1000,
          })),
        });

        // 3. Construir contexto y sistema
        const { textoContexto } = construirContexto(chunks);
        const systemPrompt = buildSystemPrompt(modo as ModoRespuesta, textoContexto);

        // 4. Streaming Gemini
        const geminiStream = await streamGemini(systemPrompt, pregunta);
        let respuestaCompleta = "";

        for await (const chunk of geminiStream.stream) {
          const text = chunk.text();
          if (text) {
            respuestaCompleta += text;
            send({ type: "chunk", text });
          }
        }

        // 5. Post-guardrail: añadir disclaimer si el LLM lo omitió
        const validacion = validarRespuesta(respuestaCompleta);
        if (!validacion.valida && validacion.motivo === "Falta disclaimer legal") {
          const disclaimerExtra =
            "\n\n---\n⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. " +
            "Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado.";
          send({ type: "chunk", text: disclaimerExtra });
          respuestaCompleta += disclaimerExtra;
        }

        // 6. Guardar consulta y enviar ID al cliente (para feedback)
        const consultaId = crypto.randomUUID();
        const latenciaMs = Date.now() - t0;
        guardarConsulta({
          id: consultaId,
          pregunta,
          modo: modo as ModoRespuesta,
          respuesta: respuestaCompleta,
          chunksUsados: chunks,
          modelo: MODEL_NAME,
          latenciaMs,
        });

        send({ type: "meta", consultaId });
        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        send({ type: "error", message: message.slice(0, 300) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Deshabilitar buffering en nginx/Vercel
    },
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function errorResponse(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
