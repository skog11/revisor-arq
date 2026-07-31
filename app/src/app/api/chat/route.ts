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
  type ChunkRecuperado,
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
import { type ContextoProyecto } from "@/components/chat/contexto-modal";
import { obtenerRelacionesNormativas, formatearRelaciones } from "@/lib/grafo";
import { aplicarReglas, formatearReglasActivas } from "@/lib/motor-reglas";
import { detectarRestricciones, formatearRestricciones } from "@/lib/detector-conflictos";
import { fetchChunksObligatorios, fetchChunksPorArticulos, mergearChunks } from "@/lib/fetcher-normas-obligatorias";
import { extraerHechos, formatearHechos } from "@/lib/extractor-hechos";
import { extraerCitasNormativas, verificarCoherenciaRestrictiva } from "@/lib/validador";
import { prepararRespuestaVerificada, RESPUESTA_NO_VERIFICABLE } from "@/lib/respuesta-verificada";
import { createClient } from "@/lib/supabase-server";
import { buscarEnCache, guardarEnCache } from "@/lib/query-cache";
import { embedText } from "@/lib/voyage";
import { buildBCNUrl } from "@/lib/bcn-links";
import { calcularConfianza } from "@/lib/confianza";
import { extraerParametros } from "@/lib/extraer-parametros";
import { extraerVacios } from "@/lib/extraer-vacios";
import { extraerCronologia } from "@/lib/extraer-cronologia";
import { detectarCalculadora } from "@/lib/detector-calculadoras";
import { detectarCuestionario } from "@/lib/cuestionario";

// ─── Validación ───────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ChatSchema = z.object({
  pregunta: z.string().min(5, "La pregunta es muy corta").max(2000, "Pregunta demasiado larga"),
  modo: z.enum(["arquitecto", "abogado", "profundo"]).default("arquitecto"),
  mensajes: z.array(MessageSchema).optional(),
  contextoProyecto: z.object({
    zonaSuelo: z.string().optional(),
    destino: z.string().optional(),
    anoOriginal: z.string().optional(),
    leyEspecial: z.string().optional(),
  }).optional(),
});

/**
 * Última salida segura para una referencia explícita ya recuperada. Se usa solo
 * cuando el LLM insiste en citar normas accesorias que el artículo menciona: no
 * infiere consecuencias, no reproduce listados y conserva una respuesta útil
 * fundada exclusivamente en el artículo solicitado.
 */
function construirRespuestaMinimaDeReferenciaExacta(chunks: Array<{ articulo: string | null; norma_tipo: string; norma_numero: string; texto: string }>): string | null {
  const fuente = chunks[0];
  if (!fuente?.articulo) return null;

  const texto = fuente.texto.replace(/^\[[^\]]+\]\s*/u, " ");
  const calificacion = texto.match(/ser[áa]n\s+considerados\s+como\s+([^,.\n:]+)/iu)?.[1]?.trim();
  const mencionaListado = /hechos?\s+previstos?\s+en\s+las?\s+siguientes?\s+disposiciones/iu.test(texto);
  const referencia = "artículo " + fuente.articulo + " de " + fuente.norma_tipo + " N° " + fuente.norma_numero;

  if (calificacion) {
    const alcance = mencionaListado
      ? "los hechos previstos en las disposiciones legales que el propio artículo enumera"
      : "los supuestos que el propio artículo establece";
    return "Según el " + referencia + ", la norma considera como " + calificacion + " " + alcance + ". " +
      "La aplicación a un caso concreto exige contrastar sus hechos con esas hipótesis; esta respuesta no extiende esa calificación fuera del alcance del artículo.";
  }

  return "El " + referencia + " es la disposición verificable directamente recuperada para esta consulta. " +
    "Su aplicación debe limitarse a los supuestos que el propio artículo regula y verificarse frente al texto vigente antes de adoptar una decisión.";
}

function obtenerReferenciasExactasDePregunta(
  pregunta: string,
  chunks: ChunkRecuperado[]
): ChunkRecuperado[] {
  const articulo = pregunta.match(/\b(?:artículo|articulo|art\.)\s*(\d+(?:\.\d+)*)/iu)?.[1];
  const norma = pregunta.match(/\b(DS|LEY|DFL|DL)\s*(?:N[°º]\s*)?(\d+(?:\.\d+)*)/iu);
  return chunks.filter((chunk) =>
    chunk.referenciaExacta ||
    Boolean(
      articulo && norma &&
      String(chunk.articulo ?? "").replace(/\.+$/u, "") === articulo &&
      chunk.norma_tipo.toUpperCase() === norma[1].toUpperCase() &&
      chunk.norma_numero.replace(/\./gu, "") === norma[2].replace(/\./gu, "")
    )
  );
}

/** Salida conservadora para una consulta SEIA cuando la evidencia del Art. 10 está recuperada. */
function construirRespuestaGuardrailSEIA(
  chunks: ChunkRecuperado[],
  reglasActivas: Array<{ regla: { id: string } }>
): string | null {
  if (!reglasActivas.some((activa) => activa.regla.id === "eia-seia-obligatorio")) return null;

  const articulo10 = chunks.find((chunk) =>
    chunk.norma_tipo.toUpperCase() === "LEY" &&
    chunk.norma_numero.replace(/\./gu, "") === "19300" &&
    String(chunk.articulo ?? "").replace(/\.+$/u, "") === "10"
  );
  if (!articulo10) return null;

  return "La sola aprobación urbanística o la ubicación en una zona comercial no reemplazan la revisión ambiental. " +
    "El artículo 10 de la Ley 19.300 exige verificar si el proyecto encuadra en alguna de las tipologías que deben ingresar al Sistema de Evaluación de Impacto Ambiental (SEIA). " +
    "Por ello, antes de iniciar obras o tratar el permiso municipal como suficiente, corresponde determinar formalmente ante la autoridad ambiental si procede el ingreso al SEIA; no es seguro afirmar que el proyecto queda exento solo por su emplazamiento urbano.";
}

function construirRespuestaGuardrailAreaVerde(
  reglasActivas: Array<{ regla: { id: string } }>
): string | null {
  const activa = reglasActivas.some((item) =>
    item.regla.id === "area-verde-publica" || item.regla.id === "bien-nacional-uso-publico"
  );
  if (!activa) return null;

  return "Una plaza o área verde pública constituye un bien nacional de uso público. " +
    "Por ello, un permiso municipal no basta para habilitar una instalación comercial permanente sobre ese espacio. " +
    "La autorización temporal de uso, si procede conforme al régimen aplicable, no equivale a un permiso para construir o mantener una obra permanente; cualquier intervención debe verificarse frente al instrumento de planificación territorial y las competencias municipales correspondientes.";
}

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

  const { pregunta, modo, mensajes, contextoProyecto } = parsed.data;

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

  // Active Prompting / Motor de Clarificación — ahora con cuestionario estructurado
  const cuestionarioActivo = detectarCuestionario(pregunta, clasificacion, contextoProyecto);
  if (cuestionarioActivo) {
    const encoder3 = new TextEncoder();
    const aclaraStream = new ReadableStream({
      start(ctrl) {
        const send = (e: Record<string, unknown>) =>
          ctrl.enqueue(encoder3.encode(`data: ${JSON.stringify(e)}\n\n`));
        send({ type: "fuentes", data: [] });
        send({ type: "cruces", data: [] });
        // Enviar cuestionario estructurado
        send({ type: "cuestionario", data: cuestionarioActivo });
        send({ type: "done" });
        ctrl.close();
      }
    });
    return new Response(aclaraStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // 1b. Lookup en caché semántica — si hay hit, devolver respuesta cacheada sin LLM.
  //     Solo para consultas sin historial (no multi-turno) para evitar respuestas fuera de contexto.
  //     BYPASS del caché si la consulta activa una regla-gatillo (motor-reglas): las respuestas
  //     cacheadas pre-compuerta pueden contener conclusiones contradictorias con la nueva lógica.
  const sinHistorial = !mensajes || mensajes.filter(m => m.role === "user").length <= 1;
  const reglasGatilloDetectadas = aplicarReglas(pregunta);
  // Bypass caché también si la consulta es sobre obra recepcionada (contexto sensible)
  const hechosPreCache = extraerHechos(pregunta);
  // Bypass también en corridas de eval: el eval hace las mismas 34 preguntas
  // cada vez, así que sin este bypass la segunda corrida en adelante prueba
  // la caché de la primera corrida, no el pipeline actual — un cambio en
  // retrieval/prompt puede quedar invisible para npm run eval durante 7 días
  // (TTL de la caché) aunque el código ya esté corregido. Detectado el
  // 2026-07-26: tres fallas del eval no se movieron un carácter después de
  // un fix real porque las tres corrían contra respuesta cacheada.
  const bypassCache = reglasGatilloDetectadas.length > 0 || hechosPreCache.sobre_obra_recepcionada || isEval;
  if (bypassCache) {
    console.log(
      isEval
        ? "[Cache] BYPASS — corrida de eval"
        : `[Cache] BYPASS — reglas activas: ${reglasGatilloDetectadas.map(r => r.regla.id).join(", ")}`
    );
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

        // Si la consulta se apoya exclusivamente en artículos explícitos y
        // ninguno existe en el corpus, no se envía al LLM: se evita tanto la
        // espera de reintentos como una posible alucinación sobre una norma
        // inexistente. Las consultas con al menos una cita respaldada siguen
        // su flujo normal para conservar el análisis de contexto.
        const citasExplicitas = extraerCitasNormativas(pregunta)
          .filter((cita) => cita.articulo.length > 0);
        if (citasExplicitas.length > 0) {
          const evidenciaExplicita = await fetchChunksPorArticulos(citasExplicitas).catch(() => []);
          if (evidenciaExplicita.length === 0) {
            send({ type: "fuentes", data: [] });
            send({ type: "confianza", data: {
              nivel: "baja", score: 0,
              razon: "La referencia explícita no existe en el corpus normativo.",
              color: "var(--terracotta)", icono: "🔴",
            } });
            send({ type: "validacion", data: { estado: "bloqueada", motivo: "Referencia normativa explícita sin respaldo en el corpus." } });
            send({ type: "chunk", text: RESPUESTA_NO_VERIFICABLE });
            send({ type: "done" });
            return;
          }
        }

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
          const chunksObligatorios = await fetchChunksObligatorios(clavesObligatorias, 3, pregunta).catch(() => []);
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

        // 2d. Calcular confianza de la respuesta
        const confianzaResult = calcularConfianza(chunks, modo as ModoRespuesta, reglasActivas.length > 0);
        send({ type: "confianza", data: confianzaResult });

        // 3. Enviar fuentes al cliente (antes de generar)
        send({
          type: "fuentes",
          data: chunks.map((c) => ({
            norma: `${c.norma_tipo} ${c.norma_numero}`,
            articulo: c.articulo,
            norma_titulo: c.norma_titulo,
            jerarquia: c.jerarquia,
            url_fuente: c.url_fuente,
            url_bcn: buildBCNUrl(c.norma_tipo, c.norma_numero),
            similarity: Math.round(c.similarity * 1000) / 1000,
            texto: c.texto,
          })),
        });

        // 3b. Enriquecer con relaciones del grafo normativo
        const relacionesGrafo = await obtenerRelacionesNormativas(chunks).catch(() => []);
        const relacionesTexto = formatearRelaciones(relacionesGrafo);

        // 3c. Construir bloque de compuerta normativa (reglas + restricciones + hechos jurídicos)
        const hechosJuridicos = extraerHechos(pregunta);
        const hechosBloque = formatearHechos(hechosJuridicos);
        const compuertaNormativa =
          formatearReglasActivas(reglasActivas) +
          formatearRestricciones(restricciones) +
          hechosBloque;

        // 4. Construir contexto y sistema (con cruces + compuerta normativa inyectados)
        const { textoContexto } = construirContexto(chunks);
        const systemPrompt = buildSystemPromptV2(
          modo as ModoRespuesta,
          textoContexto,
          cruces,
          clasificacion,
          relacionesTexto,
          pregunta,
          compuertaNormativa,
          contextoProyecto as ContextoProyecto | undefined
        );

        // 5. Streaming Gemini — Pro para modo profundo, Flash para los demás
        send({ type: "etapa", etapa: "generando" });
        const modeloElegido = modo === "profundo" ? MODEL_PRO : MODEL_FLASH;
        const generarRespuesta = async (instruccionSistema: string, mensajeUsuario: string) => {
          const geminiStream = await streamGemini(instruccionSistema, mensajeUsuario, modeloElegido);
          let texto = "";
          for await (const chunk of geminiStream.stream) {
            if (streamCancelled) break;
            const text = chunk.text();
            if (text) texto += text;
          }
          return texto;
        };
        let respuestaCompleta = await generarRespuesta(systemPrompt, pregunta);

        send({ type: "etapa", etapa: "verificando" });
        let entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
        // Reparación generalizada de evidencia: si el borrador cita un artículo
        // que no estaba en el top-k inicial, se busca ese artículo exacto antes
        // de pedir una nueva redacción. No depende de una materia o regla puntual.
        if (!entrega.entregable) {
          const citas = extraerCitasNormativas(respuestaCompleta);
          const evidenciaCitada = await fetchChunksPorArticulos(citas).catch(() => []);
          if (evidenciaCitada.length > 0) {
            chunks = mergearChunks(evidenciaCitada, chunks);
            entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
          }
        }
        // Un primer borrador puede mezclar artículos secundarios no recuperados.
        // Antes de bloquear una consulta útil, se genera una única versión corregida
        // con el mismo contexto cerrado y las observaciones concretas del validador.
        if (!entrega.entregable && !streamCancelled) {
          const { textoContexto: contextoCorregido } = construirContexto(chunks);
          const instruccionCorreccion = `${systemPrompt}\n\nCONTEXTO AMPLIADO PARA LA REVISIÓN:\n${contextoCorregido}\n\nREVISIÓN OBLIGATORIA DEL BORRADOR:\n` +
            `El borrador fue rechazado por: ${entrega.validacion.motivo}.\n` +
            "Redacta una respuesta nueva usando exclusivamente las fuentes incluidas en el contexto. " +
            "No menciones artículos, incisos ni normas que no aparezcan allí. No uses comillas ni presentes texto como literal; parafrasea y cita solo el artículo y norma efectivamente recuperados. Incluye el aviso legal obligatorio.";
          respuestaCompleta = await generarRespuesta(instruccionCorreccion, pregunta);
          entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
          // La re-redacción puede introducir una nueva referencia secundaria.
          // Se realiza una segunda (y última) expansión de evidencia antes de decidir.
          if (!entrega.entregable) {
            const citasCorreccion = extraerCitasNormativas(respuestaCompleta);
            const evidenciaCorreccion = await fetchChunksPorArticulos(citasCorreccion).catch(() => []);
            if (evidenciaCorreccion.length > 0) {
              chunks = mergearChunks(evidenciaCorreccion, chunks);
              entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
            }
          }
        }
        // Si la consulta identifica una norma y artículo concretos, esa evidencia
        // tiene prioridad probatoria sobre resultados semánticos secundarios. Si
        // los dos borradores aún se bloquearon por referencias accesorias, se hace
        // una última redacción con un contexto cerrado a la fuente expresamente
        // solicitada. La misma validación se mantiene intacta: si esa respuesta no
        // se sostiene en el artículo exacto, se bloquea de todos modos.
        if (!entrega.entregable && !streamCancelled) {
          const referenciasExactas = obtenerReferenciasExactasDePregunta(pregunta, chunks);
          if (referenciasExactas.length > 0) {
            const { textoContexto: contextoExacto } = construirContexto(referenciasExactas);
            const systemPromptExacto = buildSystemPromptV2(
              modo as ModoRespuesta,
              contextoExacto,
              cruces,
              clasificacion,
              "",
              pregunta,
              hechosBloque,
              contextoProyecto as ContextoProyecto | undefined
            );
            const instruccionExacta = `${systemPromptExacto}\n\nREDACCIÓN FINAL CON EVIDENCIA CERRADA:\n` +
              "Responde únicamente la pregunta planteada con el artículo exacto incluido en el contexto. " +
              "No introduzcas otras normas, artículos, incisos ni citas textuales. Parafrasea con precisión, " +
              "menciona solo la norma y el artículo recuperados e incluye el aviso legal obligatorio.";
            respuestaCompleta = await generarRespuesta(instruccionExacta, pregunta);
            entrega = prepararRespuestaVerificada(respuestaCompleta, referenciasExactas);
          }
        }
        // Si incluso la redacción cerrada vuelve a traer citas accesorias, no se
        // baja el estándar ni se responde con una conclusión creada por el modelo.
        // Se entrega una síntesis determinista del artículo exacto recuperado.
        if (!entrega.entregable) {
          const referenciasExactas = obtenerReferenciasExactasDePregunta(pregunta, chunks);
          const respuestaMinima = construirRespuestaMinimaDeReferenciaExacta(referenciasExactas);
          if (respuestaMinima) {
            respuestaCompleta = respuestaMinima;
            entrega = prepararRespuestaVerificada(respuestaCompleta, referenciasExactas);
          }
        }
        // Para SEIA, una respuesta genérica de “sin respaldo” es menos segura
        // que la instrucción cautelar fundada en el Art. 10 ya recuperado.
        if (!entrega.entregable) {
          const respuestaSEIA = construirRespuestaGuardrailSEIA(chunks, reglasActivas);
          if (respuestaSEIA) {
            respuestaCompleta = respuestaSEIA;
            entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
          }
        }
        if (!entrega.entregable) {
          const respuestaAreaVerde = construirRespuestaGuardrailAreaVerde(reglasActivas);
          if (respuestaAreaVerde) {
            respuestaCompleta = respuestaAreaVerde;
            entrega = prepararRespuestaVerificada(respuestaCompleta, chunks);
          }
        }
        const validacion = entrega.validacion;
        respuestaCompleta = entrega.respuesta;
        // El cliente puede ignorar este evento si no necesita mostrarlo. Mantener
        // el motivo disponible evita que un bloqueo verificable quede opaco para
        // diagnóstico y para futuras interfaces de trazabilidad.
        send({
          type: "validacion",
          data: entrega.entregable
            ? { estado: "verificada" }
            : { estado: "bloqueada", motivo: validacion.motivo ?? "Validación no superada" },
        });
        if (!entrega.entregable) {
          console.warn(`[Validación] Respuesta bloqueada tras corrección: ${validacion.motivo}`);
        }

        // Los enriquecimientos visuales usan una llamada estructurada adicional a
        // Gemini. Son opcionales y se activan solo con una clave configurada y
        // validada explícitamente; nunca deben demorar ni afectar el informe legal.
        const auxiliaresIAHabilitados = process.env.ENABLE_GEMINI_AUXILIARIES === "true";
        if (entrega.entregable && auxiliaresIAHabilitados && modo === "arquitecto") {
          const params = await extraerParametros(respuestaCompleta);
          if (params) {
            send({ type: "parametros", data: params });
          }
          
          const tipoCalculadora = await detectarCalculadora(pregunta);
          if (tipoCalculadora) {
            send({ type: "calculadora", data: tipoCalculadora });
          }
        } else if (entrega.entregable && auxiliaresIAHabilitados && modo === "profundo") {
          const vacios = await extraerVacios(respuestaCompleta);
          if (vacios) {
            send({ type: "vacios", data: vacios });
          }
          
          const crono = await extraerCronologia(respuestaCompleta);
          if (crono) {
            send({ type: "cronologia", data: crono });
          }
        }

        // 6b. Verificar coherencia con restricciones (Fase 3): si la respuesta dice "Sí es posible"
        //     pero los chunks contienen "no procede", añadir advertencia automática.
        const coherencia = entrega.entregable
          ? verificarCoherenciaRestrictiva(respuestaCompleta, restricciones)
          : { hayContradiccion: false };
        if (entrega.entregable && coherencia.hayContradiccion && coherencia.advertencia) {
          console.warn("[Coherencia] Contradicción detectada — añadiendo advertencia de verificación.");
          respuestaCompleta += coherencia.advertencia;
        }

        send({ type: "validacion", data: { estado: entrega.entregable ? "verificada" : "bloqueada", motivo: entrega.entregable ? undefined : validacion.motivo } });
        send({ type: "chunk", text: respuestaCompleta });

        // 6c. Guardar en caché semántica (fire-and-forget, solo consultas simples sin historial).
        //     NO cachear consultas con reglas-gatillo activas: el contexto restrictivo puede
        //     cambiar si la regla se actualiza y queremos evaluar siempre con la versión vigente.
        if (entrega.entregable && embeddingResult && sinHistorial && !bypassCache && respuestaCompleta.length > 100) {
          const fuentesParaCache = chunks.map((c) => ({
            norma: `${c.norma_tipo} ${c.norma_numero}`,
            articulo: c.articulo,
            norma_titulo: c.norma_titulo,
            jerarquia: c.jerarquia,
            url_fuente: c.url_fuente,
            url_bcn: buildBCNUrl(c.norma_tipo, c.norma_numero),
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
