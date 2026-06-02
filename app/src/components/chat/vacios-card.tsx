import { AlertTriangle, Lightbulb } from "lucide-react";
import type { VaciosTabla } from "@/lib/extraer-vacios";

interface Props {
  data: VaciosTabla;
}

export function VaciosCard({ data }: Props) {
  if (!data || !data.vacios || data.vacios.length === 0) return null;

  return (
    <div 
      className="mt-5 rounded-xl border overflow-hidden" 
      style={{ 
        borderColor: "color-mix(in srgb, var(--mode-abg) 30%, transparent)", 
        background: "var(--card-bg)" 
      }}
    >
      <div 
        className="flex items-center gap-2 px-4 py-3 border-b" 
        style={{ 
          borderColor: "color-mix(in srgb, var(--mode-abg) 20%, transparent)", 
          background: "color-mix(in srgb, var(--mode-abg) 5%, transparent)" 
        }}
      >
        <AlertTriangle className="size-4" style={{ color: "var(--mode-abg)" }} />
        <h3 
          className="text-[11px] font-semibold uppercase tracking-wider" 
          style={{ 
            color: "var(--mode-abg)",
            fontFamily: "var(--font-jetbrains-mono)"
          }}
        >
          Análisis Crítico / Vacíos Normativos
        </h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        {data.vacios.map((v, i) => (
          <div key={i} className="flex flex-col gap-1.5 pb-4 border-b last:pb-0 last:border-0" style={{ borderColor: "var(--rule-2)" }}>
            <h4 className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{v.tema}</h4>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {v.explicacion}
            </p>
            <div className="mt-1 flex items-start gap-2 p-2.5 rounded-lg border" style={{ background: "var(--paper-2)", borderColor: "var(--rule-2)" }}>
              <Lightbulb className="size-3.5 shrink-0 mt-0.5" style={{ color: "var(--mode-pro)" }} />
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
                <span className="font-medium mr-1" style={{ color: "var(--ink-2)" }}>Interpretación o Criterio:</span> 
                {v.sugerencia}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
