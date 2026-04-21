"use client";

import { useState } from "react";
import { HardHat, Scale, Microscope, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FuentesPanel, type Fuente } from "./fuentes-panel";

export type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

export type { Fuente };

export interface MensajeData {
  id: string;
  rol: "usuario" | "asistente";
  contenido: string;
  fuentes?: Fuente[];
  streaming?: boolean;
  error?: boolean;
  modo?: ModoRespuesta;
  consultaId?: string; // ID de la consulta guardada en Supabase para feedback
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

function FeedbackBar({ consultaId }: { consultaId?: string }) {
  const [voto, setVoto] = useState<1 | -1 | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!consultaId) return null;

  async function votar(thumbs: 1 | -1) {
    if (voto !== null || enviando) return;
    setEnviando(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta_id: consultaId, thumbs }),
      });
      setVoto(thumbs);
    } catch {
      // silencioso — el feedback no es crítico
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-3">
      <span
        className="text-[10px] mr-1"
        style={{ color: "var(--ink-4, var(--ink-3))", fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {voto === null ? "¿Útil?" : voto === 1 ? "Gracias" : "Gracias por el feedback"}
      </span>
      <button
        onClick={() => votar(1)}
        disabled={voto !== null || enviando}
        className="p-1 rounded transition-colors hover:bg-foreground/[0.06] disabled:cursor-default"
        title="Respuesta útil"
        aria-label="Marcar como útil"
      >
        <ThumbsUp
          className="size-3.5"
          style={{
            color: voto === 1 ? "var(--ra-green)" : "var(--ink-4, var(--ink-3))",
            fill: voto === 1 ? "var(--ra-green)" : "none",
          }}
        />
      </button>
      <button
        onClick={() => votar(-1)}
        disabled={voto !== null || enviando}
        className="p-1 rounded transition-colors hover:bg-foreground/[0.06] disabled:cursor-default"
        title="Respuesta incorrecta o insuficiente"
        aria-label="Marcar como incorrecta"
      >
        <ThumbsDown
          className="size-3.5"
          style={{
            color: voto === -1 ? "var(--terracotta)" : "var(--ink-4, var(--ink-3))",
            fill: voto === -1 ? "var(--terracotta)" : "none",
          }}
        />
      </button>
    </div>
  );
}

// ─── Configuración de modos ───────────────────────────────────────────────────

interface ModoCfg {
  Icon: LucideIcon;
  label: string;
  color: string;
}

const MODO_CFG: Record<ModoRespuesta, ModoCfg> = {
  arquitecto: { Icon: HardHat,    label: "Arquitecto", color: "rgb(59,130,246)" },
  abogado:    { Icon: Scale,      label: "Abogado",    color: "var(--terracotta)" },
  profundo:   { Icon: Microscope, label: "Profundo",   color: "var(--ra-green)" },
};

// ─── Mensaje usuario ──────────────────────────────────────────────────────────

function MensajeUsuario({ contenido }: { contenido: string }) {
  return (
    <div className="flex justify-end px-5 py-2.5">
      <div
        className="max-w-[72%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed"
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--rule)",
          color: "var(--ink-2)",
        }}
      >
        <p style={{ whiteSpace: "pre-wrap" }}>{contenido}</p>
      </div>
    </div>
  );
}

// ─── Mensaje asistente ────────────────────────────────────────────────────────

function MensajeAsistente({ mensaje }: { mensaje: MensajeData }) {
  const cfg = mensaje.modo ? MODO_CFG[mensaje.modo] : null;
  const accentColor = cfg?.color ?? "var(--ink-4, var(--ink-3))";

  return (
    <div className="flex gap-0 px-5 py-5">
      {/* Barra izquierda en color de modo */}
      <div
        className="w-[2px] shrink-0 rounded-full mr-5 self-stretch"
        style={{ background: accentColor, opacity: 0.45 }}
      />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Header de modo */}
        {cfg && (
          <div className="flex items-center gap-1.5 mb-3.5">
            <cfg.Icon className="size-3" style={{ color: accentColor }} />
            <span
              className="text-[9px] font-medium uppercase"
              style={{
                color: accentColor,
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.18em",
              }}
            >
              {cfg.label}
            </span>
          </div>
        )}

        {/* Estado de error */}
        {mensaje.error ? (
          <div
            className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "rgb(220,50,50)",
            }}
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <p>{mensaje.contenido || "Ocurrió un error al generar la respuesta."}</p>
              <p className="text-xs opacity-70">Si el problema persiste, intente de nuevo en unos segundos.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Markdown */}
            <div
              className="
                prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2
                prose-h3:text-[13px] prose-h3:mt-4 prose-h3:mb-1.5
                prose-p:leading-relaxed prose-p:my-2
                prose-li:leading-relaxed prose-li:my-0.5
                prose-ul:my-2 prose-ol:my-2
                prose-blockquote:border-l-2 prose-blockquote:pl-4
                prose-blockquote:italic prose-blockquote:text-sm
                prose-blockquote:not-italic
                prose-code:text-[11px] prose-code:bg-foreground/5
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-strong:font-semibold
                prose-hr:border-foreground/10 prose-hr:my-4
                prose-table:text-xs
                prose-th:font-medium prose-th:py-2
                prose-td:py-1.5
              "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {mensaje.contenido}
              </ReactMarkdown>
            </div>

            {/* Cursor parpadeante durante streaming */}
            {mensaje.streaming && (
              <span
                className="inline-block w-[2px] h-[1em] ml-0.5 animate-pulse align-text-bottom rounded-full"
                style={{ background: accentColor, opacity: 0.8 }}
              />
            )}

            {/* Panel de fuentes (solo cuando terminó el streaming) */}
            {!mensaje.streaming &&
              mensaje.fuentes &&
              mensaje.fuentes.length > 0 && (
                <FuentesPanel
                  fuentes={mensaje.fuentes}
                  initialVisible={mensaje.modo === "profundo" ? 6 : 3}
                />
              )}

            {/* Feedback */}
            {!mensaje.streaming && !mensaje.error && (
              <FeedbackBar consultaId={mensaje.consultaId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function Mensaje({ mensaje }: { mensaje: MensajeData }) {
  if (mensaje.rol === "usuario") {
    return <MensajeUsuario contenido={mensaje.contenido} />;
  }
  return <MensajeAsistente mensaje={mensaje} />;
}
