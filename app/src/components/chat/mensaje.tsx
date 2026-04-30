"use client";

import { useState } from "react";
import { HardHat, Scale, Microscope, AlertTriangle, ThumbsUp, ThumbsDown, Download } from "lucide-react";
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

// ─── Descarga PDF (modo profundo) ────────────────────────────────────────────

function descargarInformePDF(contenido: string) {
  // Convierte markdown básico a HTML para el informe
  const mdToHtml = (md: string) =>
    md
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^[-–•] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/^(?!<[hublq])(.+)$/gm, (m) => (m.trim() ? m : ""))
      .replace(/---/g, "<hr/>")
      .trim();

  const fecha = new Date().toLocaleDateString("es-CL", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe REVISOR ARQ — ${fecha}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    body { font-family: Inter, sans-serif; font-size: 13px; color: #19160f;
           max-width: 720px; margin: 0 auto; padding: 48px 40px; line-height: 1.65; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #9a907e; margin-bottom: 32px; }
    h2 { font-size: 15px; font-weight: 600; margin-top: 28px; margin-bottom: 8px;
         padding-bottom: 4px; border-bottom: 1px solid #e5e0d6; }
    h3 { font-size: 13px; font-weight: 600; margin-top: 18px; margin-bottom: 6px; }
    h4 { font-size: 12px; font-weight: 600; margin-top: 14px; color: #6a6358; }
    p { margin: 8px 0; }
    ul { margin: 6px 0; padding-left: 20px; }
    li { margin: 3px 0; }
    blockquote { border-left: 3px solid #c4bbb0; margin: 12px 0; padding: 4px 14px;
                 color: #6a6358; font-style: italic; }
    strong { font-weight: 600; }
    hr { border: none; border-top: 1px solid #e5e0d6; margin: 20px 0; }
    .disclaimer { margin-top: 32px; padding: 12px 16px; background: #f6f1e7;
                  border: 1px solid #e5e0d6; border-radius: 6px;
                  font-size: 11px; color: #9a907e; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>Informe de análisis normativo</h1>
  <p class="meta">REVISOR ARQ · ${fecha} · Modo Análisis Profundo</p>
  <p>${mdToHtml(contenido)}</p>
</body>
</html>`;

  const ventana = window.open("", "_blank");
  if (!ventana) return;
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 400);
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

            {/* Descarga PDF — solo modo profundo */}
            {!mensaje.streaming && !mensaje.error && mensaje.modo === "profundo" && mensaje.contenido && (
              <button
                onClick={() => descargarInformePDF(mensaje.contenido)}
                className="flex items-center gap-1.5 mt-3 rounded-md px-2.5 py-1 text-[11px] transition-colors hover:bg-foreground/[0.06]"
                style={{
                  border: "1px solid var(--rule)",
                  color: "var(--ink-4)",
                  background: "transparent",
                }}
                title="Descargar informe como PDF"
              >
                <Download className="size-3" />
                Descargar informe PDF
              </button>
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
