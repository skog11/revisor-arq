"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, Square, HardHat, Scale, Microscope, ChevronRight, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Mensaje, type MensajeData, type Fuente } from "@/components/chat/mensaje";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

// ─── Configuración de modos ────────────────────────────────────────────────────

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
    descripcion: "Parámetros técnicos, coeficientes y normas aplicadas con ejemplos prácticos.",
    color: "rgb(59,130,246)",
    bgSoft: "rgba(59,130,246,0.07)",
    border: "rgba(59,130,246,0.28)",
  },
  abogado: {
    Icon: Scale,
    label: "Abogado",
    descripcion: "Texto literal con citas íntegras, cadena normativa completa y análisis de vacíos.",
    color: "var(--terracotta)",
    bgSoft: "var(--terracotta-soft)",
    border: "rgba(198,74,44,0.28)",
  },
  profundo: {
    Icon: Microscope,
    label: "Profundo",
    descripcion: "Análisis exhaustivo multi-norma con remisiones cruzadas y recomendaciones.",
    color: "var(--ra-green)",
    bgSoft: "var(--ra-green-soft)",
    border: "rgba(46,101,83,0.28)",
  },
};

const MODOS: ModoRespuesta[] = ["arquitecto", "abogado", "profundo"];

// ─── Sugerencias por modo ──────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 192) + "px";
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<MensajeData[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [modo, setModo] = useState<ModoRespuesta>("arquitecto");
  const [cargando, setCargando] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Autofocus al montar
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const enviar = useCallback(
    async (textoPregunta?: string) => {
      const texto = (textoPregunta ?? pregunta).trim();
      if (!texto || cargando) return;

      const userId = crypto.randomUUID();
      const asistId = crypto.randomUUID();

      setMensajes((prev) => [
        ...prev,
        { id: userId, rol: "usuario", contenido: texto },
        { id: asistId, rol: "asistente", contenido: "", streaming: true, modo },
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

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
  const modoActivo = MODO_CFG[modo];
  const isWaitingFirstChunk =
    cargando && mensajes.length > 0 && mensajes[mensajes.length - 1]?.contenido === "";

  const limpiarChat = useCallback(() => {
    abortRef.current?.abort();
    setMensajes([]);
    setPregunta("");
    setCargando(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">

      {/* ── Área de mensajes ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence mode="popLayout">

            {/* ── Estado vacío ── */}
            {!hayMensajes && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-6 px-4 pt-10 pb-6"
              >
                {/* Marca */}
                <motion.div
                  className="text-center space-y-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <div
                    className="mx-auto size-12 rounded-xl flex items-center justify-center text-[22px] mb-3"
                    style={{
                      background: "var(--paper-2)",
                      border: "1px solid var(--rule)",
                      boxShadow: "var(--shadow-1)",
                    }}
                  >
                    ⚖
                  </div>
                  <h1
                    style={{
                      fontFamily: "var(--font-instrument-serif)",
                      fontSize: 26,
                      letterSpacing: "-0.2px",
                      color: "var(--ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    Consulta normativa urbana
                  </h1>
                  <p
                    className="text-[9px] tracking-[0.22em] uppercase"
                    style={{
                      color: "var(--ink-4, var(--ink-3))",
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    LGUC · OGUC · DDU
                  </p>
                </motion.div>

                {/* Cards de modo */}
                <motion.div
                  className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {MODOS.map((key) => {
                    const cfg = MODO_CFG[key];
                    const active = modo === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setModo(key);
                          setTimeout(() => textareaRef.current?.focus(), 50);
                        }}
                        className="text-left p-4 rounded-xl transition-all duration-200 group"
                        style={{
                          background: active ? cfg.bgSoft : "var(--paper-2)",
                          border: `1.5px solid ${active ? cfg.border : "var(--rule)"}`,
                          boxShadow: active ? "var(--shadow-1)" : "none",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2.5">
                          <cfg.Icon
                            className="size-3.5 transition-colors"
                            style={{ color: active ? cfg.color : "var(--ink-3)" }}
                          />
                          <span
                            className="text-[10px] font-medium uppercase tracking-wider"
                            style={{
                              fontFamily: "var(--font-jetbrains-mono)",
                              color: active ? cfg.color : "var(--ink-3)",
                            }}
                          >
                            {cfg.label}
                          </span>
                          {active && (
                            <span
                              className="ml-auto size-1.5 rounded-full shrink-0"
                              style={{ background: cfg.color }}
                            />
                          )}
                        </div>
                        <p
                          className="text-[11px] leading-snug"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {cfg.descripcion}
                        </p>
                      </button>
                    );
                  })}
                </motion.div>

                {/* Sugerencias contextuales al modo seleccionado */}
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <AnimatePresence mode="popLayout">
                    {SUGERENCIAS[modo].map((s, i) => (
                      <motion.button
                        key={`${modo}-${i}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, delay: i * 0.04 }}
                        onClick={() => enviar(s)}
                        className="text-left text-[11px] px-3.5 py-2.5 rounded-lg group flex items-start gap-2 transition-colors"
                        style={{
                          background: "var(--paper-2)",
                          border: "1px solid var(--rule)",
                          color: "var(--ink-2)",
                          lineHeight: 1.45,
                        }}
                      >
                        <ChevronRight
                          className="size-3 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                          style={{ color: "var(--ink-4, var(--ink-3))" }}
                        />
                        {s}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── Mensajes ── */}
            {hayMensajes && (
              <div key="mensajes" className="py-3">
                <AnimatePresence initial={false}>
                  {mensajes.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Mensaje mensaje={m} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Indicador "buscando" (mientras espera primer chunk) */}
                {isWaitingFirstChunk && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div
                      className="w-[2px] h-5 rounded-full shrink-0"
                      style={{ background: modoActivo.color, opacity: 0.4 }}
                    />
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1 rounded-full animate-bounce"
                          style={{
                            background: "var(--ink-4, var(--ink-3))",
                            animationDelay: `${i * 120}ms`,
                            animationDuration: "1s",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                      Consultando normativa…
                    </span>
                  </motion.div>
                )}

                <div ref={bottomRef} className="h-6" />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Barra de entrada ── */}
      <div
        className="border-t"
        style={{ borderColor: "var(--rule)", background: "var(--background)" }}
      >
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-3">

          {/* Barra superior: modos + nueva consulta */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-0.5">
              {MODOS.map((key) => {
                const cfg = MODO_CFG[key];
                const active = modo === key;
                return (
                  <button
                    key={key}
                    onClick={() => setModo(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150"
                    )}
                    style={{
                      background: active ? cfg.bgSoft : "transparent",
                      color: active ? cfg.color : "var(--ink-4, var(--ink-3))",
                      border: `1px solid ${active ? cfg.border : "transparent"}`,
                    }}
                  >
                    <cfg.Icon className="size-3" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Botón nueva consulta */}
            {hayMensajes && (
              <button
                onClick={limpiarChat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors hover:bg-foreground/[0.06]"
                style={{ color: "var(--ink-4, var(--ink-3))" }}
                title="Empezar nueva consulta"
              >
                <RotateCcw className="size-3" />
                Nueva consulta
              </button>
            )}
          </div>

          {/* Caja de entrada */}
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 transition-shadow focus-within:shadow-sm"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
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
              placeholder="Escribe tu consulta… (Enter para enviar, Shift+Enter para nueva línea)"
              className="flex-1 min-h-[40px] resize-none border-0 bg-transparent py-1.5 text-sm focus:outline-none placeholder:text-sm"
              style={{
                color: "var(--ink)",
                maxHeight: 192,
                lineHeight: "1.5",
              }}
              rows={1}
              disabled={cargando}
            />

            {cargando ? (
              <button
                onClick={detener}
                className="shrink-0 size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-foreground/8"
                title="Detener generación"
              >
                <Square className="size-3.5 fill-current" style={{ color: "var(--ink-3)" }} />
              </button>
            ) : (
              <button
                onClick={() => enviar()}
                disabled={!pregunta.trim()}
                className="shrink-0 size-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: pregunta.trim() ? "var(--ink)" : "transparent",
                  color: pregunta.trim() ? "var(--background)" : "var(--ink-4, var(--ink-3))",
                  opacity: pregunta.trim() ? 1 : 0.45,
                }}
                title="Enviar consulta"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>

          {/* Disclaimer legal */}
          <p
            className="text-center mt-1.5 text-[9.5px]"
            style={{ color: "var(--ink-5, var(--ink-4, var(--ink-3)))" }}
          >
            REVISOR ARQ no reemplaza asesoría profesional. Verifica siempre en{" "}
            <a
              href="https://www.bcn.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              BCN
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
