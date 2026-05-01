/**
 * POST /api/chat
 * Body: { pregunta: string, modo: "arquitecto" | "abogado" }
 * Responde con un ReadableStream (text/event-stream) de Server-Sent Events.
 *
 * Eventos SSE:
 *   data: {"type":"chunk","text":"..."}   — fragmento de texto generado
 *   data: {"type":"fuentes","data":[...]} — chunks RAG usados (enviado al inicio)
 *   data: {"type":"clasificacion","data":{tipo_proyecto,etapa,dominios,confianza}} — resultado del clasificador
 *   data: {"type":"cruces","data":[...]} — cruces regulatorios detectados
 *   data: {"type":"done"}                — fin del stream
 *   data: {"type":"meta","consultaId":"..."} — ID de consulta guardada (para feedback)
 *   data: {"type":"error","message":"..."} — error
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  construirContexto,
  guardarConsulta,
  detectarFueraDominio,
  detectarCruces,
  type ModoRespuesta,
} from "@/lib/rag";
import { streamGemini, MODEL_NAME, MODEL_PRO, MODEL_FLASH } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { clasificarConsulta } from "@/lib/clasificador";
import { routear } from "@/lib/router";
import { recuperarPorCapas } from "@/lib/retriever";
import { buildSystemPromptV2 } from "@/lib/sintetizador";
import { validarConsistencia } from "@/lib/validador";
import { createClient } from "@/lib/supabase-server";

// ─── Validación ───────────────────────────────────────────────────────────────

const ChatSchema = z.object({
  pregunta: z.string().min(5, "La pregunta es muy corta").max(2000, "Pregunta demasiado larga"),
  modo: z.enum(["arquitecto", "abogado", "profundo"]).default("arquitecto"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // Rate limiting: 20 consultas por hora por IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 20, 3_600_000);
  if (!rl.success) {
    const minutos = Math.ceil(rl.resetMs / 60_000);
    return Response.json(
      { error: `Límite de consultas alcanzado. Intenta en ${minutos} minuto${minutos !== 1 ? "s" : ""}.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

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

  // Obtener usuario autenticado (si hay sesión)
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // Sin sesión — continuar como anónimo
  }

  // Verificar y consumir cuota (solo para usuarios autenticados)
  if (userId) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("check_and_use_quota", {
        p_user_id: userId,
      }) as { data: { permitido: boolean; motivo: string } | null; error: unknown };

      if (error || !data?.permitido) {
        const motivo = data?.motivo ?? "Cuota mensual agotada";
        return Response.json({ error: motivo }, { status: 429 });
      }
    } catch {
      // Si falla la verificación de cuota, continuar (fail open)
    }
  }

  // Crear stream SSE
  const encoder = new TextEncoder();
  let streamCancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        if (streamCancelled) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      // Si el cliente desconecta, no seguir enqueuing
      req.signal.addEventListener("abort", () => { streamCancelled = true; });

      try {
        // 0. Guardrail: detectar pregunta fuera de dominio
        const rechazoDominio = detectarFueraDominio(pregunta);
        if (rechazoDominio) {
          send({ type: "fuentes", data: [] });
          send({ type: "cruces", data: [] });
          send({ type: "chunk", text: rechazoDominio });
          send({ type: "done" });
          controller.close();
          return;
        }

        // 1. Detectar cruces regulatorios (sincrónico, antes del embedding)
        const cruces = detectarCruces(pregunta);
        send({ type: "cruces", data: cruces });

        // 1b. Clasificar la consulta para determinar tipo de proyecto y dominios
        const clasificacion = await clasificarConsulta(pregunta);
        send({ type: "clasificacion", data: {
          tipo_proyecto: clasificacion.tipo_proyecto,
          etapa: clasificacion.etapa,
          dominios_detectados: clasificacion.dominios_detectados,
          confianza: clasificacion.confianza,
        }});

        // 1c. Construir plan de recuperación basado en la clasificación
        const plan = routear(clasificacion);

        // 2. Recuperar chunks por capas respetando jerarquía normativa
        const chunks = await recuperarPorCapas(pregunta, plan);

        // 3. Enviar fuentes al cliente (antes de generar)
        send({
          type: "fuentes",
          data: chunks.map((c) => ({
            norma: `${c.norma_tipo} ${c.norma_numero}`,
            articulo: c.articulo,
            norma_titulo: c.norma_titulo,
            jerarquia: c.jerarquia,
            url_fuente: c.url_fuente,
            similarity: Math.round(c.similarity * 1000) / 1000,
            texto: c.texto,
          })),
        });

        // 4. Construir contexto y sistema (con cruces inyectados)
        const { textoContexto } = construirContexto(chunks);
        const systemPrompt = buildSystemPromptV2(modo as ModoRespuesta, textoContexto, cruces, clasificacion);

        // 5. Streaming Gemini — Pro para modo profundo, Flash para los demás
        const modeloElegido = modo === "profundo" ? MODEL_PRO : MODEL_FLASH;
        const geminiStream = await streamGemini(systemPrompt, pregunta, modeloElegido);
        let respuestaCompleta = "";

        for await (const chunk of geminiStream.stream) {
          if (streamCancelled) break;
          const text = chunk.text();
          if (text) {
            respuestaCompleta += text;
            send({ type: "chunk", text });
          }
        }

        // 6. Post-guardrail: validar consistencia y añadir disclaimer si el LLM lo omitió
        const validacion = validarConsistencia(respuestaCompleta, chunks);
        if (!validacion.valida && validacion.motivo === "Falta disclaimer legal") {
          const disclaimerExtra =
            "\n\n---\n⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. " +
            "Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado.";
          send({ type: "chunk", text: disclaimerExtra });
          respuestaCompleta += disclaimerExtra;
        }
        // Añadir notas de verificación si hay artículos no verificados
        if (validacion.notasAdicionales) {
          send({ type: "chunk", text: validacion.notasAdicionales });
          respuestaCompleta += validacion.notasAdicionales;
        }

        // 7. Guardar consulta y enviar ID al cliente (para feedback)
        const consultaId = crypto.randomUUID();
        const latenciaMs = Date.now() - t0;
        await guardarConsulta({
          id: consultaId,
          pregunta,
          modo: modo as ModoRespuesta,
          respuesta: respuestaCompleta,
          chunksUsados: chunks,
          modelo: modeloElegido,
          latenciaMs,
          userId,
          // Pipeline v2 metadata:
          clasificacion,
          advertenciasValidacion: validacion.advertencias,
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
