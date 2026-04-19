"use client";

import { ExternalLink, BookOpen, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Fuente {
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

function TipoIcon({ tipo }: { tipo: string }) {
  if (tipo === "LGUC" || tipo === "OGUC") return <Scale className="size-3" />;
  return <BookOpen className="size-3" />;
}

function tipoColor(tipo: string) {
  if (tipo === "LGUC") return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (tipo === "OGUC") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
}

export function FuentesPanel({ fuentes, className }: FuentesPanelProps) {
  if (!fuentes.length) return null;

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", className)}
      style={{ background: "var(--paper-2)", borderColor: "var(--rule)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
      >
        Fuentes recuperadas ({fuentes.length})
      </p>
      <div className="space-y-1.5">
        {fuentes.map((f, i) => {
          const [tipo, numero] = f.norma.split(" ");
          return (
            <div key={i} className="flex items-start gap-2 text-xs group">
              <span className="mt-0.5 shrink-0 text-[10px] font-mono w-4 text-center"
                style={{ color: "var(--ink-3)" }}
              >
                {i + 1}
              </span>
              <div className="flex flex-1 min-w-0 items-start gap-1.5 flex-wrap">
                <Badge variant="outline"
                  className={cn("shrink-0 gap-1 text-[10px] px-1.5 py-0.5 h-auto border", tipoColor(tipo))}
                >
                  <TipoIcon tipo={tipo} />
                  {tipo} {numero}
                </Badge>
                {f.articulo && (
                  <span className="shrink-0 font-medium" style={{ color: "var(--ink-2)" }}>
                    Art. {f.articulo}
                  </span>
                )}
                {f.jerarquia && (
                  <span className="truncate" style={{ color: "var(--ink-3)" }}>
                    {f.jerarquia}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[10px]"
                  style={{ color: "var(--ink-4, var(--ink-3))", fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  {(f.similarity * 100).toFixed(0)}%
                </span>
              </div>
              {f.url_fuente && (
                <a href={f.url_fuente} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ink-3)" }}
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
