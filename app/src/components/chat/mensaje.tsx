"use client";

import { Bot, User, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { FuentesPanel } from "./fuentes-panel";

export type ModoRespuesta = "arquitecto" | "abogado";

export interface Fuente {
  norma: string;
  articulo: string | null;
  norma_titulo: string;
  jerarquia: string | null;
  url_fuente: string;
  similarity: number;
}

export interface MensajeData {
  id: string;
  rol: "usuario" | "asistente";
  contenido: string;
  fuentes?: Fuente[];
  streaming?: boolean;
  error?: boolean;
  modo?: ModoRespuesta;
}

interface MensajeProps {
  mensaje: MensajeData;
}

function ModoBadge({ modo }: { modo: ModoRespuesta }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        fontFamily: "var(--font-jetbrains-mono)",
        background: modo === "arquitecto"
          ? "rgba(59,130,246,0.08)"
          : "rgba(139,92,246,0.08)",
        color: modo === "arquitecto"
          ? "rgb(59,130,246)"
          : "rgb(139,92,246)",
        border: `1px solid ${modo === "arquitecto" ? "rgba(59,130,246,0.2)" : "rgba(139,92,246,0.2)"}`,
      }}
    >
      {modo === "arquitecto" ? "⚙ Arquitecto" : "⚖ Abogado"}
    </span>
  );
}

export function Mensaje({ mensaje }: MensajeProps) {
  const isUser = mensaje.rol === "usuario";

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 size-7 rounded-full flex items-center justify-center mt-0.5",
          isUser
            ? "bg-foreground/10"
            : "border"
        )}
        style={!isUser ? { background: "var(--paper-2)", borderColor: "var(--rule)" } : undefined}
      >
        {isUser
          ? <User className="size-3.5" />
          : <Bot className="size-3.5" style={{ color: "var(--ink-2)" }} />
        }
      </div>

      {/* Burbuja */}
      <div className={cn("flex flex-col gap-2 max-w-[85%]", isUser && "items-end")}>
        {/* Modo badge para mensajes de asistente */}
        {!isUser && mensaje.modo && (
          <ModoBadge modo={mensaje.modo} />
        )}

        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm"
              : "rounded-tl-sm",
            mensaje.error && "border border-red-500/20"
          )}
          style={{
            background: isUser
              ? "var(--paper-2)"
              : mensaje.error
              ? "rgba(239,68,68,0.05)"
              : "transparent",
            border: isUser ? "1px solid var(--rule)" : undefined,
            color: mensaje.error ? "rgb(239,68,68)" : "var(--ink)",
          }}
        >
          {mensaje.error && (
            <div className="flex items-center gap-2 mb-2 text-red-500">
              <AlertTriangle className="size-4" />
              <span className="font-medium text-xs uppercase tracking-wide">Error</span>
            </div>
          )}

          {isUser ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{mensaje.contenido}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-p:leading-relaxed prose-li:leading-relaxed
              prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:italic
              prose-code:text-xs prose-code:bg-foreground/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-strong:font-semibold
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {mensaje.contenido}
              </ReactMarkdown>
            </div>
          )}

          {/* Cursor parpadeante durante streaming */}
          {mensaje.streaming && !mensaje.error && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom"
              style={{ background: "var(--ink-2)" }}
            />
          )}
        </div>

        {/* Panel de fuentes */}
        {!isUser && mensaje.fuentes && mensaje.fuentes.length > 0 && (
          <FuentesPanel fuentes={mensaje.fuentes} className="w-full" />
        )}
      </div>
    </div>
  );
}
