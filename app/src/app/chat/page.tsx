"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, Square, HardHat, Scale, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mensaje, type MensajeData, type ModoRespuesta, type Fuente } from "@/components/chat/mensaje";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Sugerencias iniciales ─────────────────────────────────────────────────────

const SUGERENCIAS = [
  "¿Cuál es la altura máxima de edificación en zonas residenciales?",
  "¿Qué permisos se requieren para subdividir un terreno?",
  "¿Cuáles son las normas de estacionamiento en la OGUC?",
  "¿Qué establece el Art. 116 de la LGUC sobre permisos de edificación?",
];

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

  const enviar = useCallback(
    async (textoPregunta?: string) => {
      const texto = (textoPregunta ?? pregunta).trim();
      if (!texto || cargando) return;

      // Agregar mensaje del usuario
      const userId = crypto.randomUUID();
      const asistId = crypto.randomUUID();

      setMensajes((prev) => [
        ...prev,
        { id: userId, rol: "usuario", contenido: texto },
        { id: asistId, rol: "asistente", contenido: "", streaming: true, modo },
      ]);
      setPregunta("");
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

        if (!res.ok || !res.body) {
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
                data?: Fuente[];
                message?: string;
              };

              if (event.type === "fuentes" && event.data) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId ? { ...m, fuentes: event.data } : m
                  )
                );
              } else if (event.type === "chunk" && event.text) {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId
                      ? { ...m, contenido: m.contenido + event.text }
                      : m
                  )
                );
              } else if (event.type === "done") {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId ? { ...m, streaming: false } : m
                  )
                );
              } else if (event.type === "error") {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === asistId
                      ? {
                          ...m,
                          contenido: event.message ?? "Error desconocido",
                          streaming: false,
                          error: true,
                        }
                      : m
                  )
                );
              }
            } catch {
              // JSON parcial — ignorar
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMensajes((prev) =>
            prev.map((m) =>
              m.id === asistId && m.streaming
                ? { ...m, streaming: false }
                : m
            )
          );
        } else {
          setMensajes((prev) =>
            prev.map((m) =>
              m.id === asistId
                ? {
                    ...m,
                    contenido: (err as Error).message,
                    streaming: false,
                    error: true,
                  }
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

  const detener = () => {
    abortRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const hayMensajes = mensajes.length > 0;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* ── Área de mensajes ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-6">
          <AnimatePresence mode="popLayout">
            {!hayMensajes ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 px-4 pt-12"
              >
                {/* Logo / título */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="size-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
                  >
                    ⚖
                  </div>
                  <h1
                    className="text-center"
                    style={{
                      fontFamily: "var(--font-instrument-serif)",
                      fontSize: 28,
                      letterSpacing: "-0.3px",
                      color: "var(--ink)",
                    }}
                  >
                    Consulta normativa urbana
                  </h1>
                  <p className="text-center text-sm" style={{ color: "var(--ink-3)", maxWidth: 380 }}>
                    Pregunta sobre LGUC, OGUC y DDUs. Cada respuesta incluye citas verificables
                    de los artículos relevantes.
                  </p>
                </div>

                {/* Sugerencias */}
                <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGERENCIAS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => enviar(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--rule)",
                        color: "var(--ink-2)",
                        lineHeight: 1.4,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              mensajes.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Mensaje mensaje={m} />
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {/* Spinner de carga (mientras espera primer chunk) */}
          {cargando && mensajes[mensajes.length - 1]?.contenido === "" && (
            <div className="flex items-center gap-2 px-4 py-3 ml-10">
              <Loader2 className="size-4 animate-spin" style={{ color: "var(--ink-3)" }} />
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                Buscando en la normativa…
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Barra de entrada ── */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--rule)", background: "var(--background)" }}
      >
        <div className="mx-auto max-w-3xl">
          {/* Selector de modo */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs mr-1" style={{ color: "var(--ink-3)" }}>Modo:</span>
            {(["arquitecto", "abogado"] as ModoRespuesta[]).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                )}
                style={{
                  background: modo === m
                    ? (m === "arquitecto" ? "rgba(59,130,246,0.12)" : "rgba(139,92,246,0.12)")
                    : "transparent",
                  color: modo === m
                    ? (m === "arquitecto" ? "rgb(59,130,246)" : "rgb(139,92,246)")
                    : "var(--ink-3)",
                  border: `1px solid ${modo === m
                    ? (m === "arquitecto" ? "rgba(59,130,246,0.25)" : "rgba(139,92,246,0.25)")
                    : "transparent"}`,
                }}
              >
                {m === "arquitecto"
                  ? <HardHat className="size-3" />
                  : <Scale className="size-3" />
                }
                {m === "arquitecto" ? "Arquitecto" : "Abogado"}
              </button>
            ))}
          </div>

          {/* Textarea + botón */}
          <div
            className="flex items-end gap-2 rounded-xl p-2"
            style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
          >
            <Textarea
              ref={textareaRef}
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre normativa urbanística… (Enter para enviar)"
              className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ color: "var(--ink)" }}
              rows={1}
              disabled={cargando}
            />

            {cargando ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={detener}
                className="shrink-0 size-9 rounded-lg"
                title="Detener"
              >
                <Square className="size-4 fill-current" style={{ color: "var(--ink-2)" }} />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => enviar()}
                disabled={!pregunta.trim()}
                className="shrink-0 size-9 rounded-lg"
                style={{
                  background: pregunta.trim() ? "var(--ink)" : "var(--paper-3, var(--paper-2))",
                  color: pregunta.trim() ? "var(--background)" : "var(--ink-3)",
                }}
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>

          <p className="text-center text-[10px] mt-1.5" style={{ color: "var(--ink-4, var(--ink-3))" }}>
            REVISOR ARQ no reemplaza asesoría legal profesional. Verifica siempre en{" "}
            <a href="https://www.bcn.cl" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70">
              BCN
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
