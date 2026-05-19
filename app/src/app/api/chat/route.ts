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

// Aumentar el timeout máximo a 300s para soportar modo profundo en Vercel Pro.
// En Vercel Hobby (60s) esta declaración no tiene efecto, pero no causa error.
// Al hacer upgrade a Vercel Pro, el timeout se aplicará automáticamente.
export const maxDuration = 300;

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
import { 
  procesarEntrada, 
  type Message, 
  type QueryClassificada 
} from "@/lib/clasificador";
import { routear } from "@/lib/router";
import { recuperarPorCapas } from "@/lib/retriever";
import { recuperarAgenticamente } from "@/lib/agentic-retriever";
import { buildSystemPromptV2 } from "@/lib/sintetizador";
import { obtenerRelacionesNormativas, formatearRelaciones } from "@/lib/grafo";
import { aplicarReglas, formatearReglasActivas } from "@/lib/motor-reglas";
import { detectarRestricciones, formatearRestricciones } from "@/lib/detector-conflictos";
import { fetchChunksObligatorios, mergearChunks } from "@/lib/fetcher-normas-obligatorias";
import { validarConsistencia, verificarCoherenciaRestrictiva } from "@/lib/validador";
import { createClient } from "@/lib/supabase-server";
import { buscarEnCache, guardarEnCache } from "@/lib/query-cache";
import { embedText } from "@/lib/voyage";

// ─── Validación ───────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatSchema = z.object({
  pregunta: z.string().min(5, "La pregunta es muy corta").max(2000, "Pregunta demasiado larga"),
  modo: z.enum(["arquitecto", "abogado", "profundo"]).default("arquitecto"),
  mensajes: z.array(MessageSchema).optional(),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // Bypass de rate limit para evaluaciones internas (ADMIN_SECRET)
  const adminSecret = process.env.ADMIN_SECRET;
  const isEval = adminSecret && req.headers.get("x-eval-secret") === adminSecret;

  // Rate limiting: 20 consultas por hora por IP (saltado en evals)
  if (!isEval) {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(ip, 20, 3_600_000);
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

  const { pregunta, modo, mensajes } = parsed.data;

  // ── Helper: obtener usuario y verificar cuota ─────────────────────────────
  // Se extrae como función para ejecutarse en paralelo con procesarEntrada.
  async function obtenerUsuarioYVerificarCuota(): Promise<{ userId?: string; cuotaAgotada: boolean }> {
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // Sin sesión — continuar como anónimo
      return { cuotaAgotada: false };
    }

    if (!userId) return { cuotaAgotada: false };

    try {
      const supabase = await createClient();
      const { data: permitido, error } = await supabase.rpc("check_and_use_quota", {
        p_user_id: userId,
      }) as { data: boolean | null; error: unknown };

      if (error || permitido === false) {
        return { userId, cuotaAgotada: true };
      }
    } catch {
      // Si falla la verificación de cuota, continuar (fail open)
    }

    return { userId, cuotaAgotada: false };
  }

  // 1. Clasificar + reescribir query + embed + auth — todo en paralelo.
  //    procesarEntrada: ~3-8s | embed: ~300ms | auth+cuota: ~300ms
  const [entradaResult, authResult, embeddingResult] = await Promise.all([
    procesarEntrada(pregunta, mensajes),
    obtenerUsuarioYVerificarCuota(),
    embedText(pregunta).catch(() => null), // para lookup en caché semántica
  ]);

  const { standalone_query: queryRAG, clasificacion } = entradaResult;
  const { userId, cuotaAgotada } = authResult;

  console.log(`[Chat] Standalone Query: ${queryRAG}`);

  if (cuotaAgotada) {
    return Response.json({ error: "Cuota mensual agotada. Actualiza tu plan en /pricing." }, { status: 429 });
  }

  // 1b. Lookup en caché semántica — si hay hit, devolver respuesta cacheada sin LLM.
  //     Solo para consultas sin historial (no multi-turno) para evitar respuestas fuera de contexto.
  //     BYPASS del caché si la consulta activa una regla-gatillo (motor-reglas): las respuestas
  //     cacheadas pre-compuerta pueden contener conclusiones contradictorias con la nueva lógica.
  const sinHistorial = !mensajes || mensajes.filter(m => m.role === "user").length <= 1;
  const reglasGatilloDetectadas = aplicarReglas(pregunta);
  const bypassCache = reglasGatilloDetectadas.length > 0;
  if (bypassCache) {
    console.log(`[Cache] BYPASS — reglas activas: ${reglasGatilloDetectadas.map(r => r.regla.id).join(", ")}`);
  }
  if (embeddingResult && sinHistorial && !bypassCache) {
    const cacheHit = await buscarEnCache(embeddingResult, modo);
    if (cacheHit) {
      console.log(`[Cache] Hit — similarity: ${cacheHit.similarity.toFixed(4)}, id: ${cacheHit.id}`);
      const encoder2 = new TextEncoder();
      const cacheStream = new ReadableStream({
        start(ctrl) {
          const send = (e: Record<string, unknown>) =>
            ctrl.enqueue(encoder2.encode(`data: ${JSON.stringify(e)}\n\n`));
          send({ type: "fuentes", data: cacheHit.fuentes });
          send({ type: "cruces", data: [] });
          // Stream la respuesta cacheada en chunks de ~200 chars para mantener UX fluida
          const texto = cacheHit.respuesta;
          for (let i = 0; i < texto.length; i += 200) {
            send({ type: "chunk", text: texto.slice(i, i + 200) });
          }
          send({ type: "meta", consultaId: cacheHit.id, fromCache: true });
          send({ type: "done" });
          ctrl.close();
        },
      });
      return new Response(cacheStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "X-Cache": "HIT",
        },
      });
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
        const cruces = detectarCruces(queryRAG);
        send({ type: "cruces", data: cruces });

        // 1b. Enviar clasificación (ya procesada arriba)
        send({ type: "clasificacion", data: {
          tipo_proyecto: clasificacion.tipo_proyecto,
          etapa: clasificacion.etapa,
          dominios_detectados: clasificacion.dominios_detectados,
          confianza: clasificacion.confianza,
        }});

        // 1c. Construir plan de recuperación basado en la clasificación
        const plan = routear(clasificacion);

        // 2. Recuperar chunks — agentic (2 rondas + análisis de gaps) en modo profundo,
        //    estándar (HyDE + multi-query + rerank) en arquitecto/abogado
        send({ type: "etapa", etapa: "recuperando" });
        const chunksRecuperados = modo === "profundo"
          ? await recuperarAgenticamente(queryRAG, plan, 20)
          : await recuperarPorCapas(queryRAG, plan);

        // 2b. COMPUERTA NORMATIVA — aplicar reglas-gatillo sobre la consulta original.
        //     Si match, recuperar chunks obligatorios de normas restrictivas (DDU 161, etc.)
        //     y mergearlos al inicio del paquete.
        const reglasActivas = aplicarReglas(pregunta);
        let chunks = chunksRecuperados;
        if (reglasActivas.length > 0) {
          const clavesObligatorias = Array.from(
            new Set(reglasActivas.flatMap((r) => r.regla.forzar_normas))
          );
          const chunksObligatorios = await fetchChunksObligatorios(clavesObligatorias, 3).catch(() => []);
          if (chunksObligatorios.length > 0) {
            chunks = mergearChunks(chunksObligatorios, chunksRecuperados);
            console.log(
              `[Compuerta] Reglas activas: ${reglasActivas.map(r => r.regla.id).join(", ")}. ` +
              `Chunks forzados: ${chunksObligatorios.length}.`
            );
          }
        }

        // 2c. Detectar restricciones / conflictos en el paquete final
        const restricciones = detectarRestricciones(chunks);

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

        // 3b. Enriquecer con relaciones del grafo normativo
        const relacionesGrafo = await obtenerRelacionesNormativas(chunks).catch(() => []);
        const relacionesTexto = formatearRelaciones(relacionesGrafo);

        // 3c. Construir bloque de compuerta normativa (reglas + restricciones)
        const compuertaNormativa =
          formatearReglasActivas(reglasActivas) + formatearRestricciones(restricciones);

        // 4. Construir contexto y sistema (con cruces + compuerta normativa inyectados)
        const { textoContexto } = construirContexto(chunks);
        const systemPrompt = buildSystemPromptV2(
          modo as ModoRespuesta,
          textoContexto,
          cruces,
          clasificacion,
          relacionesTexto,
          pregunta,
          compuertaNormativa
        );

        // 5. Streaming Gemini — Pro para modo profundo, Flash para los demás
        send({ type: "etapa", etapa: "generando" });
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

        // 6b. Verificar coherencia con restricciones (Fase 3): si la respuesta dice "Sí es posible"
        //     pero los chunks contienen "no procede", añadir advertencia automática.
        const coherencia = verificarCoherenciaRestrictiva(respuestaCompleta, restricciones);
        if (coherencia.hayContradiccion && coherencia.advertencia) {
          console.warn("[Coherencia] Contradicción detectada — añadiendo advertencia de verificación.");
          send({ type: "chunk", text: coherencia.advertencia });
          respuestaCompleta += coherencia.advertencia;
        }

        // 6c. Guardar en caché semántica (fire-and-forget, solo consultas simples sin historial).
        //     NO cachear consultas con reglas-gatillo activas: el contexto restrictivo puede
        //     cambiar si la regla se actualiza y queremos evaluar siempre con la versión vigente.
        if (embeddingResult && sinHistorial && !bypassCache && respuestaCompleta.length > 100) {
          const fuentesParaCache = chunks.map((c) => ({
            norma: `${c.norma_tipo} ${c.norma_numero}`,
            articulo: c.articulo,
            norma_titulo: c.norma_titulo,
            jerarquia: c.jerarquia,
            url_fuente: c.url_fuente,
            similarity: Math.round(c.similarity * 1000) / 1000,
            texto: c.texto,
          }));
          guardarEnCache(embeddingResult, queryRAG, modo, respuestaCompleta, fuentesParaCache as never);
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
        console.error("[route] Error en pipeline RAG:", err);
        
        // Manejo específico cuando fallan ambos LLMs por rate limits o fallos de API
        if (message.includes("429") || message.includes("503") || message.includes("rate limit") || message.includes("Rate limit")) {
           send({ 
             type: "error", 
             message: "El servicio se encuentra experimentando una alta demanda y no pudo procesar tu consulta en este momento. Por favor, intenta nuevamente en unos minutos." 
           });
        } else {
           send({ type: "error", message: `Ocurrió un error al procesar la respuesta: ${message.slice(0, 200)}` });
        }
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
