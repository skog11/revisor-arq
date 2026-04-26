"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, Square, HardHat, Scale, Microscope, ChevronRight, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Mensaje, type MensajeData, type Fuente, type CruceDetectado } from "@/components/chat/mensaje";
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
    descripcion: "Factibilidad, impacto en diseño, datos faltantes y próximos pasos del proyecto.",
    color: "var(--ra-blue)",
    bgSoft: "var(--ra-blue-soft)",
    border: "color-mix(in srgb, var(--ra-blue) 28%, transparent)",
  },
  abogado: {
    Icon: Scale,
    label: "Abogado",
    descripcion: "Conclusión jurídica, fundamento normativo, jerarquía de fuentes y riesgos interpretativos.",
    color: "var(--terracotta)",
    bgSoft: "var(--terracotta-soft)",
    border: "rgba(198,74,44,0.28)",
  },
  profundo: {
    Icon: Microscope,
    label: "Profundo",
    descripcion: "Análisis multidisciplinario con cruces regulatorios, matriz de permisos y hoja de ruta.",
    color: "var(--ra-green)",
    bgSoft: "var(--ra-green-soft)",
    border: "rgba(46,101,83,0.28)",
  },
};

const MODOS: ModoRespuesta[] = ["arquitecto", "abogado", "profundo"];

// ─── Sugerencias por modo ──────────────────────────────────────────────────────

const SUGERENCIAS: Record<ModoRespuesta, string[]> = {
  arquitecto: [
    "¿Es factible construir un edificio de 5 pisos en zona residencial según la OGUC?",
    "¿Qué parámetros de constructibilidad y densidad aplica el Art. 2.7.1 de la OGUC?",
    "¿Qué permisos se requieren para subdividir un predio urbano?",
    "¿Qué datos necesito para calcular la altura máxima permitida en zona mixta?",
  ],
  abogado: [
    "¿Cuál es el texto literal del Art. 116 de la LGUC sobre permisos de edificación?",
    "¿Qué jerarquía normativa existe entre la LGUC, la OGUC y las circulares DDU?",
    "¿Existen tensiones interpretativas en el régimen de regularización de obras?",
    "¿Cómo define la LGUC el concepto de obra nueva y qué normas concordantes aplican?",
  ],
  profundo: [
    "Analiza el régimen completo de subdivisión predial con cruces entre LGUC, OGUC y DDU.",
    "¿Cómo interactúan las normas de rasante con los planos reguladores comunales?",
    "¿Qué cadena de permisos requiere una obra de ampliación en zona de conservación?",
    "Analiza las exigencias de accesibilidad universal: normas aplicables, permisos y hoja de ruta.",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 192) + "px";
}

// ─── Helpers localStorage ─────────────────────────────────────────────────────

const STORAGE_KEY = "ra_chat_history";
const STORAGE_RATE_KEY = "ra_rate_window";
const MAX_STORED_MENSAJES = 40; // Limitar para no exceder el espacio de localStorage
const RATE_LIMIT_MAX = 20;
const RATE_WINDOW_MS = 3_600_000; // 1 hora

/** Cuenta consultas enviadas en la ventana de 1 hora (lado cliente, orientativo) */
function getRemainingClient(): number {
  try {
    const raw = localStorage.getItem(STORAGE_RATE_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recientes = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    return Math.max(0, RATE_LIMIT_MAX - recientes.length);
  } catch {
    return RATE_LIMIT_MAX;
  }
}

function registrarConsulta() {
  try {
    const raw = localStorage.getItem(STORAGE_RATE_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recientes = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    recientes.push(now);
    localStorage.setItem(STORAGE_RATE_KEY, JSON.stringify(recientes));
  } catch { /* ignorar */ }
}

/** Serializa mensajes para guardar (descarta el texto completo de fuentes para ahorrar espacio) */
function serializarMensajes(mensajes: MensajeData[]): MensajeData[] {
  return mensajes.slice(-MAX_STORED_MENSAJES).map((m) => ({
    ...m,
    streaming: false,
    fuentes: m.fuentes?.map((f) => ({ ...f, texto: undefined })),
  }));
}

function guardarEnStorage(mensajes: MensajeData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializarMensajes(mensajes)));
  } catch {
    // localStorage puede estar lleno o bloqueado (modo privado estricto)
  }
}

function cargarDeStorage(): MensajeData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MensajeData[];
    // Filtrar mensajes en estado de streaming (quedaron incompletos)
    return parsed.filter((m) => !m.streaming);
  } catch {
    return [];
  }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<MensajeData[]>(() => {
    // Cargar historial de localStorage al montar (solo en cliente)
    if (typeof window === "undefined") return [];
    return cargarDeStorage();
  });
  const [pregunta, setPregunta] = useState("");
  const [modo, setModo] = useState<ModoRespuesta>("arquitecto");
  const [cargando, setCargando] = useState(false);
  const [restantes, setRestantes] = useState<number>(() => {
    if (typeof window === "undefined") return RATE_LIMIT_MAX;
    return getRemainingClient();
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persistir mensajes en localStorage cuando cambian (solo mensajes completados)
  useEffect(() => {
    if (mensajes.length === 0) return;
    guardarEnStorage(mensajes);
  }, [mensajes]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Autofocus al montar
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Abortar stream si el componente se desmonta (navegación)
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
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
        { id: asistId, rol: "asistente", contenido: "", streaming: true, modo, pregunta: texto },
      ]);
      setPregunta("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setCargando(true);
      registrarConsulta();
      setRestantes(getRemainingClient());

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto, modo }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          if (res.status === 429) {
            const j = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(j.error ?? "Límite de consultas alcanzado. Intenta en unos minutos.");
          }
          throw new Error(`Error del servidor: ${res.status}`);
        }

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
                data?: Fuente[] | CruceDetectado[];
                message?: string;
                consultaId?: string;
              };

              if (event.type === "cruces" && event.data) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId
                      ? { ...m, cruces: event.data as CruceDetectado[] }
                      : m
                  )
                );
              } else if (event.type === "fuentes" && event.data) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId ? { ...m, fuentes: event.data as Fuente[] } : m
                  )
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
    if (e.key === "Escape" && cargando) {
      detener();
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
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignorar */ }
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
                        aria-pressed={active}
                        className="text-left p-4 rounded-xl transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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

            {/* Contador de consultas restantes + botón nueva consulta */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Indicador de consultas restantes (orientativo) */}
              <span
                className="text-[10px] tabular-nums"
                style={{
                  color: restantes <= 5 ? "var(--terracotta)" : "var(--ink-4, var(--ink-3))",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
                title={`${restantes} de ${RATE_LIMIT_MAX} consultas disponibles en la próxima hora`}
              >
                {restantes}/{RATE_LIMIT_MAX}
              </span>
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
          </div>

          {/* Caja de entrada */}
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-0"
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

          {/* Footer: disclaimer + contador de caracteres */}
          <div className="flex items-center justify-between mt-1.5">
            <p
              className="text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              REVISOR ARQ no reemplaza asesoría profesional. Verifica en{" "}
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
            {pregunta.length > 0 && (
              <span
                className="text-[10px] tabular-nums shrink-0 ml-2"
                style={{
                  color: pregunta.length > 1800 ? "var(--terracotta)" : "var(--ink-4, var(--ink-3))",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {pregunta.length}/2000
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
