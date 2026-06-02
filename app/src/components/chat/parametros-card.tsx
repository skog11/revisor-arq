import { HardHat } from "lucide-react";
import type { ParametrosTabla } from "@/lib/extraer-parametros";

interface Props {
  data: ParametrosTabla;
}

export function ParametrosCard({ data }: Props) {
  if (!data || !data.parametros || data.parametros.length === 0) return null;

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
        <HardHat className="size-4" style={{ color: "var(--mode-arq)" }} />
        <h3 
          className="text-[11px] font-semibold uppercase tracking-wider" 
          style={{ 
            color: "var(--ink)",
            fontFamily: "var(--font-jetbrains-mono)"
          }}
        >
          Resumen de Parámetros Normativos
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ color: "var(--ink-2)" }}>
          <thead>
            <tr style={{ background: "color-mix(in srgb, var(--foreground) 2%, transparent)" }}>
              <th className="px-4 py-2.5 font-medium text-[12px] border-b" style={{ borderColor: "var(--rule-2)" }}>Parámetro</th>
              <th className="px-4 py-2.5 font-medium text-[12px] border-b" style={{ borderColor: "var(--rule-2)" }}>Valor</th>
              <th className="px-4 py-2.5 font-medium text-[12px] border-b" style={{ borderColor: "var(--rule-2)" }}>Fuente</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--rule-2)" }}>
            {data.parametros.map((p, i) => (
              <tr key={i} className="transition-colors hover:bg-foreground/[0.02]">
                <td className="px-4 py-2.5 whitespace-nowrap text-[13px]">{p.nombre}</td>
                <td className="px-4 py-2.5 font-mono text-[12.5px] font-medium" style={{ color: "var(--mode-arq)" }}>{p.valor}</td>
                <td className="px-4 py-2.5 text-[11.5px]" style={{ color: "var(--ink-4)" }}>{p.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
