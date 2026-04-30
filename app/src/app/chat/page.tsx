"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Send, Square, HardHat, Scale, Microscope, RotateCcw, BookOpen, Info, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Mensaje, type MensajeData, type Fuente } from "@/components/chat/mensaje";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

// ─── Configuración de modos ─────────────────────────────────────────────────
// Iteración 2: modo colors apuntan a variables CSS muted (cálidas en dark,
// sobrias en light) — sin neón, sin gradientes.

interface ModoCfg {
  Icon: LucideIcon;
  label: string;
  descripcion: string;
  color: string;
  bgSoft: string;
  border: string;
}

const MODO_CFG: Record<ModoRespuesta, ModoCfg> = {
  arquitecto: {
    Icon: HardHat,
    label: "Arquitecto",
    descripcion: "Parámetros técnicos, coeficientes y normas con ejemplos constructivos prácticos.",
    color: "var(--mode-arq)",
    bgSoft: "var(--mode-arq-soft)",
    border: "var(--mode-arq-border)",
  },
  abogado: {
    Icon: Scale,
    label: "Abogado",
    descripcion: "Texto literal con citas íntegras, cadena normativa y análisis de vacíos legales.",
    color: "var(--mode-abg)",
    bgSoft: "var(--mode-abg-soft)",
    border: "var(--mode-abg-border)",
  },
  profundo: {
    Icon: Microscope,
    label: "Profundo",
    descripcion: "Análisis multi-norma con remisiones cruzadas y recomendaciones exhaustivas.",
    color: "var(--mode-pro)",
    bgSoft: "var(--mode-pro-soft)",
    border: "var(--mode-pro-border)",
  },
};

const MODOS: ModoRespuesta[] = ["arquitecto", "abogado", "profundo"];

// ─── Sugerencias por modo ───────────────────────────────────────────────────

const SUGERENCIAS: Record<ModoRespuesta, string[]> = {
  arquitecto: [
    "¿Cuál es la altura máxima de edificación en zona residencial?",
    "¿Qué coeficientes de constructibilidad aplica el Art. 2.7.1 de la OGUC?",
    "¿Qué establece el Art. 116 de la LGUC sobre permisos de edificación?",
    "¿Cuántos estacionamientos exige la OGUC para uso residencial?",
  ],
  abogado: [
    "¿Cuál es el texto literal del Art. 116 de la LGUC?",
    "¿Qué dispone el Art. 2.1.25 de la OGUC sobre densidades?",
    "¿Cómo define la LGUC el concepto de loteo?",
    "¿Cuáles son los requisitos del Art. 1.4.1 de la OGUC para apertura de vías?",
  ],
  profundo: [
    "Analiza el régimen completo de subdivisión predial en la LGUC y la OGUC.",
    "¿Cómo interactúan las normas de rasante de la OGUC con las DDU recientes?",
    "¿Qué cadena normativa regula la recepción de obras en Chile?",
    "Analiza las exigencias de accesibilidad universal en edificios de uso público.",
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 192) + "px";
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<MensajeData[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [modo, setModo]         = useState<ModoRespuesta>("arquitecto");
  const [cargando, setCargando] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Autofocus
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const enviar = useCallback(
    async (textoPregunta?: string) => {
      const texto = (textoPregunta ?? pregunta).trim();
      if (!texto || cargando) return;

      const userId  = crypto.randomUUID();
      const asistId = crypto.randomUUID();

      setMensajes((prev) => [
        ...prev,
        { id: userId,  rol: "usuario",   contenido: texto },
        { id: asistId, rol: "asistente", contenido: "", streaming: true, modo, preguntaUsuario: texto },
      ]);
      setPregunta("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setCargando(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto, modo }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) throw new Error(`Error del servidor: ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            try {
              const event = JSON.parse(json) as {
                type: string;
                text?: string;
                data?: Fuente[];
                message?: string;
                consultaId?: string;
              };

              if (event.type === "fuentes" && event.data) {
                setMensajes((prev) =>
                  prev.map((m) => (m.id === asistId ? { ...m, fuentes: event.data } : m))
                );
              } else if (event.type === "chunk" && event.text) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId ? { ...m, contenido: m.contenido + event.text } : m
                  )
                );
              } else if (event.type === "meta" && event.consultaId) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId ? { ...m, consultaId: event.consultaId } : m
                  )
                );
              } else if (event.type === "done") {
                setMensajes((prev) =>
                  prev.map((m) => (m.id === asistId ? { ...m, streaming: false } : m))
                );
              } else if (event.type === "error") {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId
                      ? { ...m, contenido: event.message ?? "Error desconocido", streaming: false, error: true }
                      : m
                  )
                );
              }
            } catch {
              /* JSON parcial — ignorar */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMensajes((prev) =>
            prev.map((m) => (m.id === asistId && m.streaming ? { ...m, streaming: false } : m))
          );
        } else {
          setMensajes((prev) =>
            prev.map((m) =>
              m.id === asistId
                ? { ...m, contenido: (err as Error).message, streaming: false, error: true }
                : m
            )
          );
        }
      } finally {
        setCargando(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [pregunta, modo, cargando]
  );

  const detener = () => abortRef.current?.abort();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const hayMensajes = mensajes.length > 0;
  const modoActivo  = MODO_CFG[modo];
  const isWaitingFirstChunk =
    cargando && mensajes.length > 0 && mensajes[mensajes.length - 1]?.contenido === "";

  const limpiarChat = useCallback(() => {
    abortRef.current?.abort();
    setMensajes([]);
    setPregunta("");
    setCargando(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  // Sin canvas, sin aurora, sin glassmorphism.
  // Fondo = var(--background) estático — Nordic puro.

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col">

      {/* ══════════════════════════════════════════════════
          ÁREA DE MENSAJES
      ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="popLayout">

            {/* ── Estado vacío — diseño nórdico ── */}
            {!hayMensajes && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center px-5 pt-12 pb-10 gap-10"
              >

                {/* ── 1. Hero ─────────────────────────────────── */}
                <motion.section
                  className="text-center max-w-lg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 }}
                >
                  <h1
                    className="mb-3"
                    style={{
                      fontFamily:    "var(--font-instrument-serif)",
                      fontSize:      "clamp(26px, 3.5vw, 38px)",
                      fontWeight:    400,
                      letterSpacing: "-0.015em",
                      lineHeight:    1.15,
                      color:         "var(--ink)",
                    }}
                  >
                    Consulta{" "}
                    <em style={{ fontStyle: "italic" }}>normativa urbana</em>
                  </h1>
                  <p
                    style={{
                      fontSize:   14,
                      color:      "var(--ink-3)",
                      lineHeight: 1.55,
                    }}
                  >
                    Respuestas fundamentadas en la LGUC, OGUC, DDU y demás cuerpos normativos.
                    Citas verificables, sin interpretaciones inventadas.
                  </p>
                </motion.section>

                {/* ── 2. Modos — tarjetas planas ──────────────── */}
                {/* Iteración 2: sin gradient lines, sin glow dots, sin translateY.
                    Activo = borde izquierdo coloreado + bg tintado muy suave. */}
                <motion.section
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  <p
                    className="mb-3"
                    style={{
                      fontSize:      10.5,
                      fontWeight:    500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color:         "var(--ink-4)",
                    }}
                  >
                    Modo de respuesta
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {MODOS.map((key) => {
                      const cfg    = MODO_CFG[key];
                      const active = modo === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setModo(key);
                            setTimeout(() => textareaRef.current?.focus(), 50);
                          }}
                          className="text-left transition-colors duration-150"
                          style={{
                            background:  active ? cfg.bgSoft : "var(--card-bg)",
                            border:      "1px solid var(--rule)",
                            borderLeft:  active ? `3px solid ${cfg.color}` : "1px solid var(--rule)",
                            borderRadius: 8,
                            padding:     "14px 14px 14px " + (active ? "13px" : "14px"),
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <cfg.Icon
                              className="size-3.5 shrink-0"
                              style={{ color: active ? cfg.color : "var(--ink-4)" }}
                            />
                            <span
                              style={{
                                fontSize:      11,
                                fontWeight:    600,
                                letterSpacing: "0.04em",
                                color:         active ? cfg.color : "var(--ink-3)",
                              }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize:   11.5,
                              lineHeight: 1.5,
                              color:      "var(--ink-3)",
                            }}
                          >
                            {cfg.descripcion}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </motion.section>

                {/* ── 3. Consultas frecuentes ─────────────────── */}
                {/* Iteración 3: chips limpios, texto en Inter (no mono),
                    contraste ≥ 4.5:1 sobre el fondo de carta. */}
                <motion.section
                  className="w-full max-w-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.20 }}
                >
                  <p
                    className="mb-3"
                    style={{
                      fontSize:      10.5,
                      fontWeight:    500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color:         "var(--ink-4)",
                    }}
                  >
                    Consultas frecuentes
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <AnimatePresence mode="popLayout">
                      {SUGERENCIAS[modo].map((s, i) => (
                        <motion.button
                          key={`${modo}-${i}`}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.12, delay: i * 0.03 }}
                          onClick={() => enviar(s)}
                          className="group text-left transition-colors duration-150"
                          style={{
                            background:   "var(--card-bg)",
                            border:       "1px solid var(--rule)",
                            borderRadius: 8,
                            padding:      "10px 13px",
                            fontSize:     12,
                            color:        "var(--ink-2)",
                            lineHeight:   1.5,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--paper-2)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--card-bg)";
                          }}
                        >
                          {s}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>

              </motion.div>
            )}

            {/* ── Mensajes ── */}
            {hayMensajes && (
              <div key="mensajes" className="py-4">
                <AnimatePresence initial={false}>
                  {mensajes.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      <Mensaje mensaje={m} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Indicador "consultando" */}
                {isWaitingFirstChunk && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div
                      className="w-[2px] h-4 rounded-full shrink-0"
                      style={{ background: modoActivo.color, opacity: 0.5 }}
                    />
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1 rounded-full animate-bounce"
                          style={{
                            background:        "var(--ink-4)",
                            animationDelay:    `${i * 120}ms`,
                            animationDuration: "1s",
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      Consultando normativa…
                    </span>
                  </motion.div>
                )}

                <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DOCK FLOTANTE — navegación contextual
          Iteración 2: visible solo con mensajes activos,
          fijo bottom-left en desktop, limpio y sin colores.
          No tapa el input centrado.
      ══════════════════════════════════════════════════ */}
      {hayMensajes && (
        <div
          className="fixed bottom-24 left-5 z-30 hidden md:flex flex-col"
          style={{
            background:   "var(--card-bg)",
            border:       "1px solid var(--rule)",
            borderRadius: 10,
            boxShadow:    "var(--shadow-2)",
            overflow:     "hidden",
            minWidth:     148,
          }}
        >
          {/* Label */}
          <div
            className="px-3 py-2"
            style={{
              borderBottom: "1px solid var(--rule)",
              fontSize:     9,
              fontWeight:   600,
              letterSpacing:"0.10em",
              textTransform:"uppercase",
              color:        "var(--ink-5)",
            }}
          >
            Navegación
          </div>

          <button
            onClick={limpiarChat}
            className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-foreground/[0.04] text-left"
            style={{ fontSize: 12, color: "var(--ink-3)" }}
          >
            <Plus className="size-3.5 shrink-0" style={{ color: "var(--mode-arq)" }} />
            Nueva consulta
          </button>

          <Link
            href="/corpus"
            className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-foreground/[0.04] no-underline"
            style={{ fontSize: 12, color: "var(--ink-3)" }}
          >
            <BookOpen className="size-3.5 shrink-0" style={{ color: "var(--ink-4)" }} />
            Corpus
          </Link>

          <Link
            href="/#como-funciona"
            className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-foreground/[0.04] no-underline"
            style={{ fontSize: 12, color: "var(--ink-3)" }}
          >
            <Info className="size-3.5 shrink-0" style={{ color: "var(--ink-4)" }} />
            Cómo funciona
          </Link>

          {/* Disclaimer */}
          <div
            className="px-3 py-2"
            style={{ borderTop: "1px solid var(--rule)" }}
          >
            <a
              href="https://www.bcn.cl"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize:   9.5,
                color:      "var(--ink-4)",
                textDecoration: "underline",
                textDecorationColor: "var(--rule-2)",
              }}
            >
              Verificar en BCN ↗
            </a>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BARRA DE ENTRADA — limpia, sin glassmorphism
          Iteración 3: fondo plano, borde simple, focus
          cambia borde (no glow). Disclamer legible.
      ══════════════════════════════════════════════════ */}
      <div
        className="shrink-0 border-t"
        style={{
          borderColor: "var(--rule)",
          background:  "var(--background)",
        }}
      >
        <div className="mx-auto max-w-2xl px-5 pt-3 pb-4">

          {/* Selector modo + nueva consulta */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-0.5 overflow-x-auto shrink-0">
              {MODOS.map((key) => {
                const cfg    = MODO_CFG[key];
                const active = modo === key;
                return (
                  <button
                    key={key}
                    onClick={() => setModo(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors duration-150"
                    )}
                    style={{
                      background: active ? cfg.bgSoft  : "transparent",
                      color:      active ? cfg.color   : "var(--ink-4)",
                      border:     `1px solid ${active ? cfg.border : "transparent"}`,
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    <cfg.Icon className="size-3" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {hayMensajes && (
              <button
                onClick={limpiarChat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors hover:bg-foreground/[0.04]"
                style={{ color: "var(--ink-4)" }}
                title="Nueva consulta"
              >
                <RotateCcw className="size-3" />
                Nueva consulta
              </button>
            )}
          </div>

          {/* Caja de texto — plana, borde simple */}
          <div
            className="flex items-end gap-2 rounded-lg px-3.5 py-2.5 transition-colors duration-150 focus-within:border-[var(--mode-arq-border)]"
            style={{
              background: "var(--card-bg)",
              border:     "1px solid var(--rule-2)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={pregunta}
              onChange={(e) => {
                setPregunta(e.target.value);
                resizeTextarea(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre normativa urbana…"
              className="flex-1 min-h-[40px] resize-none border-0 bg-transparent py-0.5 text-sm focus:outline-none"
              style={{
                color:      "var(--ink)",
                maxHeight:  192,
                lineHeight: "1.55",
              }}
              rows={1}
              disabled={cargando}
            />

            {cargando ? (
              <button
                onClick={detener}
                className="shrink-0 size-8 rounded-md flex items-center justify-center transition-colors hover:bg-foreground/[0.06]"
                title="Detener"
              >
                <Square className="size-3.5 fill-current" style={{ color: "var(--ink-3)" }} />
              </button>
            ) : (
              <button
                onClick={() => enviar()}
                disabled={!pregunta.trim()}
                className="shrink-0 size-8 rounded-md flex items-center justify-center transition-all"
                style={{
                  background: pregunta.trim() ? "var(--ink)" : "transparent",
                  color:      pregunta.trim() ? "var(--paper)" : "var(--ink-4)",
                  opacity:    pregunta.trim() ? 1 : 0.4,
                }}
                title="Enviar consulta"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>

          {/* Footer: hints teclado + disclaimer */}
          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <div
              className="hidden sm:flex items-center gap-3"
              style={{ fontSize: 10, color: "var(--ink-5)" }}
            >
              <span>↵ enviar</span>
              <span>⇧↵ nueva línea</span>
            </div>
            <p style={{ fontSize: 9.5, color: "var(--ink-5)" }}>
              No reemplaza asesoría profesional ·{" "}
              <a
                href="https://www.bcn.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--ink-4)" }}
              >
                BCN
              </a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
