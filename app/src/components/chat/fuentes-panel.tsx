"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface Fuente {
  norma: string;
  articulo: string | null;
  norma_titulo: string;
  jerarquia: string | null;
  url_fuente: string;
  similarity: number;
}

interface FuentesPanelProps {
  fuentes: Fuente[];
  className?: string;
}

const TIPO_COLOR: Record<string, string> = {
  LGUC:         "rgb(59,130,246)",
  OGUC:         "rgb(16,185,129)",
  DDU:          "rgb(201,138,31)",
  DDU_ESPECIFICA: "rgb(220,100,46)",
};

const INITIAL_VISIBLE = 3;

export function FuentesPanel({ fuentes, className }: FuentesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!fuentes.length) return null;

  const visible = expanded ? fuentes : fuentes.slice(0, INITIAL_VISIBLE);
  const hiddenCount = fuentes.length - INITIAL_VISIBLE;

  return (
    <div className={cn("mt-5", className)}>
      {/* Separador con label */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px flex-1" style={{ background: "var(--rule)" }} />
        <span
          className="text-[9px] uppercase tracking-[0.18em] px-1"
          style={{
            color: "var(--ink-4, var(--ink-3))",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {fuentes.length} referencia{fuentes.length !== 1 ? "s" : ""}
        </span>
        <div className="h-px flex-1" style={{ background: "var(--rule)" }} />
      </div>

      {/* Tabla de fuentes */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}
      >
        <AnimatePresence initial={false}>
          {visible.map((f, i) => {
            const parts = f.norma.split(" ");
            const tipo = parts[0];
            const numero = parts.slice(1).join(" ");
            const color = TIPO_COLOR[tipo] ?? "var(--ink-3)";
            const pct = Math.round(f.similarity * 100);

            return (
              <motion.div
                key={`${f.norma}-${f.articulo ?? ""}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.14 }}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 group transition-colors",
                    "hover:bg-foreground/[0.025]",
                    i < visible.length - 1 && "border-b"
                  )}
                  style={
                    i < visible.length - 1
                      ? { borderColor: "var(--rule)" }
                      : undefined
                  }
                >
                  {/* Indicador de tipo */}
                  <div
                    className="w-[3px] self-stretch rounded-full shrink-0"
                    style={{ background: color, opacity: 0.7, minHeight: 24 }}
                  />

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-medium tabular-nums"
                        style={{
                          color,
                          fontFamily: "var(--font-jetbrains-mono)",
                        }}
                      >
                        {tipo} {numero}
                      </span>
                      {f.articulo && (
                        <span
                          className="text-[10px]"
                          style={{
                            color: "var(--ink-3)",
                            fontFamily: "var(--font-jetbrains-mono)",
                          }}
                        >
                          · Art. {f.articulo}
                        </span>
                      )}
                    </div>
                    {f.jerarquia && (
                      <p
                        className="text-[10px] truncate leading-snug mt-0.5"
                        style={{ color: "var(--ink-4, var(--ink-3))" }}
                        title={f.jerarquia}
                      >
                        {f.jerarquia}
                      </p>
                    )}
                  </div>

                  {/* Barra de similitud */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="w-10 h-[3px] rounded-full overflow-hidden"
                      style={{ background: "var(--rule-2, rgba(0,0,0,0.12))" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color, opacity: 0.65 }}
                      />
                    </div>
                    <span
                      className="text-[10px] w-5 text-right tabular-nums"
                      style={{
                        color: "var(--ink-4, var(--ink-3))",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {pct}
                    </span>
                  </div>

                  {/* Enlace externo */}
                  {f.url_fuente && (
                    <a
                      href={f.url_fuente}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity"
                      style={{ color: "var(--ink-3)" }}
                      title={`Ver ${f.norma_titulo || f.norma} en BCN`}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Expandir / colapsar */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] transition-colors hover:bg-foreground/[0.03]"
            style={{
              borderTop: "1px solid var(--rule)",
              color: "var(--ink-4, var(--ink-3))",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                Ver {hiddenCount} más
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
