"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface Fuente {
  norma: string;
  articulo: string | null;
  norma_titulo: string;
  jerarquia: string | null;
  url_fuente: string;
  similarity: number;
  texto?: string;
}

interface FuentesPanelProps {
  fuentes: Fuente[];
  className?: string;
  initialVisible?: number;
}

const TIPO_COLOR: Record<string, string> = {
  LGUC:           "rgb(59,130,246)",
  OGUC:           "rgb(16,185,129)",
  DDU:            "rgb(201,138,31)",
  DDU_ESPECIFICA: "rgb(220,100,46)",
};

// ─── Drawer de texto completo ─────────────────────────────────────────────────

function ArticuloDrawer({
  fuente,
  onClose,
}: {
  fuente: Fuente;
  onClose: () => void;
}) {
  const parts = fuente.norma.split(" ");
  const tipo = parts[0];
  const numero = parts.slice(1).join(" ");
  const color = TIPO_COLOR[tipo] ?? "var(--ink-3)";

  return (
    <>
      {/* Overlay */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />

      {/* Panel lateral */}
      <motion.aside
        key="drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-lg shadow-2xl"
        style={{
          background: "var(--paper)",
          borderLeft: "1px solid var(--rule)",
        }}
      >
        {/* Cabecera */}
        <div
          className="flex items-start gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          {/* Barra de color de norma */}
          <div
            className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5"
            style={{ background: color, opacity: 0.7, minHeight: 32 }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{
                  color,
                  fontFamily: "var(--font-jetbrains-mono)",
                  letterSpacing: "0.06em",
                }}
              >
                {tipo} {numero}
              </span>
              {fuente.articulo && (
                <span
                  className="text-[11px]"
                  style={{
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-jetbrains-mono)",
                  }}
                >
                  · Art. {fuente.articulo}
                </span>
              )}
            </div>
            {fuente.norma_titulo && (
              <p
                className="mt-1 text-xs leading-snug"
                style={{ color: "var(--ink-2)" }}
              >
                {fuente.norma_titulo}
              </p>
            )}
            {fuente.jerarquia && (
              <p
                className="mt-0.5 text-[10px]"
                style={{
                  color: "var(--ink-4, var(--ink-3))",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {fuente.jerarquia}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {fuente.url_fuente && (
              <a
                href={fuente.url_fuente}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg transition-colors hover:bg-foreground/[0.06]"
                style={{ color: "var(--ink-3)" }}
                title="Ver en BCN"
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-foreground/[0.06]"
              style={{ color: "var(--ink-3)" }}
              title="Cerrar"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Texto del artículo */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {fuente.texto ? (
            <pre
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                color: "var(--ink-2)",
                fontFamily: "inherit",
              }}
            >
              {fuente.texto}
            </pre>
          ) : (
            <div
              className="flex flex-col items-center gap-3 py-12 text-center"
              style={{ color: "var(--ink-4, var(--ink-3))" }}
            >
              <FileText className="size-8 opacity-40" />
              <p className="text-sm">Texto no disponible</p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div
          className="px-5 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--rule)" }}
        >
          <p
            className="text-[10px] leading-relaxed"
            style={{
              color: "var(--ink-4, var(--ink-3))",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Fragmento recuperado por similitud semántica. Verifica el texto
            completo vigente en{" "}
            {fuente.url_fuente ? (
              <a
                href={fuente.url_fuente}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                BCN
              </a>
            ) : (
              "BCN"
            )}
            .
          </p>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Panel de fuentes ─────────────────────────────────────────────────────────

export function FuentesPanel({ fuentes, className, initialVisible = 3 }: FuentesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Fuente | null>(null);

  if (!fuentes.length) return null;

  const visible = expanded ? fuentes : fuentes.slice(0, initialVisible);
  const hiddenCount = fuentes.length - initialVisible;

  return (
    <>
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
              const tieneTexto = !!f.texto;

              return (
                <motion.div
                  key={`${f.norma}-${f.articulo ?? ""}-${i}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  <button
                    onClick={() => tieneTexto ? setSelected(f) : undefined}
                    disabled={!tieneTexto}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors",
                      tieneTexto && "hover:bg-foreground/[0.04] cursor-pointer",
                      !tieneTexto && "cursor-default",
                      i < visible.length - 1 && "border-b"
                    )}
                    style={
                      i < visible.length - 1
                        ? { borderColor: "var(--rule)" }
                        : undefined
                    }
                    title={tieneTexto ? "Ver texto completo del artículo" : undefined}
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

                    {/* Icono de expandir / enlace externo */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {tieneTexto && (
                        <span
                          className="opacity-0 group-hover:opacity-40 transition-opacity"
                          style={{ color: "var(--ink-3)" }}
                        >
                          <FileText className="size-3" />
                        </span>
                      )}
                      {f.url_fuente && (
                        <a
                          href={f.url_fuente}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity"
                          style={{ color: "var(--ink-3)" }}
                          title={`Ver ${f.norma_titulo || f.norma} en BCN`}
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </button>
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

      {/* Drawer del artículo seleccionado */}
      <AnimatePresence>
        {selected && (
          <ArticuloDrawer fuente={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
