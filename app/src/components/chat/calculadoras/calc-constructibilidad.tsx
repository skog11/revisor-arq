import { useState } from "react";
import { Calculator } from "lucide-react";

export function CalcConstructibilidad() {
  const [supPredio, setSupPredio] = useState<number>(1000);
  const [coef, setCoef] = useState<number>(2.5);

  const supEdificable = (supPredio * coef) || 0;

  return (
    <div 
      className="mt-5 rounded-xl border p-4" 
      style={{ 
        borderColor: "var(--rule)", 
        background: "var(--paper-2)" 
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="size-4" style={{ color: "var(--mode-arq)" }} />
        <h4 
          className="text-[12px] font-semibold uppercase tracking-wider" 
          style={{ 
            color: "var(--ink)",
            fontFamily: "var(--font-jetbrains-mono)"
          }}
        >
          Calculadora de Constructibilidad
        </h4>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
            Superficie del Predio (m²)
          </label>
          <input 
            type="number" 
            value={supPredio || ""} 
            onChange={e => setSupPredio(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ 
              background: "var(--card-bg)", 
              borderColor: "var(--rule-2)",
              color: "var(--ink)"
            }}
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
            Coeficiente (ej. 2.5)
          </label>
          <input 
            type="number" 
            step="0.1"
            value={coef || ""} 
            onChange={e => setCoef(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ 
              background: "var(--card-bg)", 
              borderColor: "var(--rule-2)",
              color: "var(--ink)"
            }}
          />
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: "var(--rule-2)" }}>
        <div>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Superficie Máxima Edificable</p>
          <p className="text-[10px] italic mt-0.5" style={{ color: "var(--ink-4)" }}>Descontando áreas comunes y subterráneos s/OGUC</p>
        </div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--mode-arq)" }}>
          {supEdificable.toLocaleString("es-CL")} <span className="text-sm font-medium">m²</span>
        </p>
      </div>
    </div>
  );
}
