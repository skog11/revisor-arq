"use client";

import { useState, useCallback } from "react";
import { HardHat, Scale, Microscope, AlertTriangle, ThumbsUp, ThumbsDown, FileDown, Copy, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FuentesPanel, type Fuente } from "./fuentes-panel";
import { ModalExportarPDF } from "./modal-exportar-pdf";
import type { CruceDetectado } from "@/lib/rag";

export type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

export type { Fuente };
export type { CruceDetectado };

export interface MensajeData {
  id: string;
  rol: "usuario" | "asistente";
  contenido: string;
  pregunta?: string;           // pregunta del usuario que originó esta respuesta
  fuentes?: Fuente[];
  cruces?: CruceDetectado[];   // dominios regulatorios cruzados detectados
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
  arquitecto: { Icon: HardHat,    label: "Arquitecto", color: "var(--ra-blue)" },
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

// ─── Chips de cruce regulatorio ──────────────────────────────────────────────

function CrucesAlert({ cruces }: { cruces: CruceDetectado[] }) {
  const [expandido, setExpandido] = useState(false);

  if (!cruces.length) return null;

  return (
    <div
      className="mb-4 rounded-lg overflow-hidden"
      style={{
        border: "1px solid color-mix(in srgb, var(--ra-warn, #c98a1f) 35%, transparent)",
        background: "var(--ra-warn-soft, rgba(201,138,31,0.07))",
      }}
    >
      {/* Fila de chips siempre visible */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        aria-expanded={expandido}
      >
        <span className="text-[10px]" aria-hidden>⚠️</span>
        <span
          className="text-[10px] font-medium uppercase tracking-wider flex-1"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--ra-warn, #c98a1f)",
          }}
        >
          Cruce(s) regulatorio(s) detectado(s)
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {cruces.map((c) => (
            <span
              key={c.area}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "color-mix(in srgb, var(--ra-warn, #c98a1f) 15%, transparent)",
                color: "var(--ra-warn, #c98a1f)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              <span aria-hidden>{c.emoji}</span>
              {c.area}
            </span>
          ))}
        </div>
        <span
          className="text-[10px] ml-1 transition-transform duration-200 shrink-0"
          style={{
            color: "var(--ink-4, var(--ink-3))",
            display: "inline-block",
            transform: expandido ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {/* Detalle expandible */}
      {expandido && (
        <div
          className="px-3 pb-3 space-y-2 border-t"
          style={{ borderColor: "color-mix(in srgb, var(--ra-warn, #c98a1f) 20%, transparent)" }}
        >
          {cruces.map((c) => (
            <div key={c.area} className="pt-2">
              <p
                className="text-[11px] font-medium mb-0.5"
                style={{ color: "var(--ink-2)" }}
              >
                {c.emoji} {c.area}
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                <span style={{ color: "var(--ink-3)" }}>Organismo: </span>
                <span style={{ color: "var(--ink-2)" }}>{c.organismo}</span>
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                <span>Marco probable: </span>
                <span style={{ color: "var(--ink-2)" }}>{c.norma_probable}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Botón de copiar ─────────────────────────────────────────────────────────

function CopyButton({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback para entornos sin API clipboard
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }, [texto]);

  return (
    <button
      onClick={copiar}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all hover:bg-foreground/[0.06]"
      style={{
        color: copiado ? "var(--ra-green)" : "var(--ink-4, var(--ink-3))",
        fontFamily: "var(--font-jetbrains-mono)",
        border: "1px solid var(--rule)",
      }}
      title={copiado ? "¡Copiado!" : "Copiar respuesta"}
    >
      {copiado ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copiado ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

// ─── Mensaje asistente ────────────────────────────────────────────────────────

function MensajeAsistente({ mensaje }: { mensaje: MensajeData }) {
  const [modalPDFAbierto, setModalPDFAbierto] = useState(false);
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
              className="text-[10px] font-medium uppercase"
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
            role="alert"
            className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
            style={{
              background: "var(--terracotta-soft)",
              border: "1px solid color-mix(in srgb, var(--terracotta) 25%, transparent)",
              color: "var(--terracotta)",
            }}
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed space-y-1">
              <p>{mensaje.contenido || "Ocurrió un error al generar la respuesta."}</p>
              <p className="text-xs opacity-70">Si el problema persiste, intente de nuevo en unos segundos.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Alertas de cruce regulatorio */}
            {mensaje.cruces && mensaje.cruces.length > 0 && (
              <CrucesAlert cruces={mensaje.cruces} />
            )}

            {/* Markdown */}
            <div
              className="
                prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:text-base prose-h2:mt-7 prose-h2:mb-3
                prose-h3:text-[13px] prose-h3:mt-5 prose-h3:mb-2
                prose-p:leading-[1.75] prose-p:my-3
                prose-li:leading-[1.7] prose-li:my-1
                prose-ul:my-3 prose-ol:my-3 prose-ul:space-y-0.5 prose-ol:space-y-0.5
                prose-blockquote:border-l-2 prose-blockquote:pl-4
                prose-blockquote:italic prose-blockquote:text-sm
                prose-blockquote:not-italic
                prose-code:text-[11px] prose-code:bg-foreground/5
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-strong:font-bold prose-strong:text-foreground
                prose-hr:border-foreground/10 prose-hr:my-6
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

            {/* Feedback + Acciones */}
            {!mensaje.streaming && !mensaje.error && (
              <div className="flex items-center justify-between mt-3">
                <FeedbackBar consultaId={mensaje.consultaId} />
                <div className="flex items-center gap-1.5">
                  {/* Botón copiar */}
                  {mensaje.contenido.length > 10 && (
                    <CopyButton texto={mensaje.contenido} />
                  )}
                  {/* Botón PDF — solo cuando hay contenido suficiente */}
                  {mensaje.contenido.length > 100 && (
                    <button
                      onClick={() => setModalPDFAbierto(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-colors hover:bg-foreground/[0.06]"
                      style={{
                        color: "var(--ink-4, var(--ink-3))",
                        fontFamily: "var(--font-jetbrains-mono)",
                        border: "1px solid var(--rule)",
                      }}
                      title="Exportar como informe PDF"
                    >
                      <FileDown className="size-3" />
                      PDF
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal PDF */}
      {modalPDFAbierto && (
        <ModalExportarPDF
          datos={{
            pregunta: mensaje.pregunta ?? "",
            modo: mensaje.modo ?? "arquitecto",
            modoLabel: cfg?.label ?? "Arquitecto",
            contenido: mensaje.contenido,
            fuentes: mensaje.fuentes?.map((f) => ({
              norma: f.norma,
              articulo: f.articulo,
              norma_titulo: f.norma_titulo,
              url_fuente: f.url_fuente,
            })),
            cruces: mensaje.cruces,
            fecha: new Date().toLocaleDateString("es-CL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          }}
          onCerrar={() => setModalPDFAbierto(false)}
        />
      )}
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
