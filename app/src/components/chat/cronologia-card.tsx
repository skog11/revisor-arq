import { History } from "lucide-react";
import type { CronologiaTabla } from "@/lib/extraer-cronologia";

interface Props {
  data: CronologiaTabla;
}

export function CronologiaCard({ data }: Props) {
  if (!data || !data.eventos || data.eventos.length === 0) return null;

  return (
    <div 
      className="mt-5 rounded-xl border overflow-hidden" 
      style={{ 
        borderColor: "var(--rule)", 
        background: "var(--card-bg)" 
      }}
    >
      <div 
        className="flex items-center gap-2 px-4 py-3 border-b" 
        style={{ 
          borderColor: "var(--rule)", 
          background: "var(--paper-2)" 
        }}
      >
        <History className="size-4" style={{ color: "var(--mode-pro)" }} />
        <h3 
          className="text-[11px] font-semibold uppercase tracking-wider" 
          style={{ 
            color: "var(--mode-pro)",
            fontFamily: "var(--font-jetbrains-mono)"
          }}
        >
          Evolución Normativa
        </h3>
      </div>
      
      <div className="p-5">
        <div className="relative border-l ml-2 pl-5 space-y-5" style={{ borderColor: "var(--rule-2)" }}>
          {data.eventos.map((e, i) => (
            <div key={i} className="relative">
              {/* Punto de la línea de tiempo */}
              <div 
                className="absolute w-2.5 h-2.5 rounded-full -left-[25px] top-1" 
                style={{ 
                  background: "var(--mode-pro)", 
                  boxShadow: "0 0 0 4px var(--card-bg)" 
                }} 
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--mode-pro)" }}>
                  {e.anio}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                  {e.norma}
                </span>
                <span className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {e.hito}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
