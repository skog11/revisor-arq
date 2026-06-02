import { useState } from "react";
import { Car } from "lucide-react";

export function CalcEstacionamientos() {
  const [unidades, setUnidades] = useState<number>(100);
  const [tasa, setTasa] = useState<number>(1);
  const [zona, setZona] = useState<string>("A"); // A o B

  // Un cálculo simple de ejemplo
  const base = Math.ceil(unidades * tasa);
  // Zona A exige 10% adicional visitas, Zona B 15%
  const visitas = Math.ceil(base * (zona === "A" ? 0.10 : 0.15));
  const total = base + visitas;

  return (
    <div 
      className="mt-5 rounded-xl border p-4" 
      style={{ 
        borderColor: "var(--rule)", 
        background: "var(--paper-2)" 
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Car className="size-4" style={{ color: "var(--mode-arq)" }} />
        <h4 
          className="text-[12px] font-semibold uppercase tracking-wider" 
          style={{ 
            color: "var(--ink)",
            fontFamily: "var(--font-jetbrains-mono)"
          }}
        >
          Estimador de Estacionamientos
        </h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
            Unidades / Viviendas
          </label>
          <input 
            type="number" 
            value={unidades || ""} 
            onChange={e => setUnidades(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: "var(--ink)" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
            Tasa PRC (Est/Unid)
          </label>
          <input 
            type="number" 
            step="0.5"
            value={tasa || ""} 
            onChange={e => setTasa(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: "var(--ink)" }}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--ink-3)" }}>
            Zona Exigencia Visitas
          </label>
          <select 
            value={zona} 
            onChange={e => setZona(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-[13px] transition-colors focus:outline-none"
            style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: "var(--ink)" }}
          >
            <option value="A">Zona A (10%)</option>
            <option value="B">Zona B (15%)</option>
          </select>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: "var(--rule-2)" }}>
        <div className="flex gap-4">
          <div>
            <p className="text-[10px]" style={{ color: "var(--ink-4)" }}>Residentes</p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--ink-2)" }}>{base}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--ink-4)" }}>Visitas</p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--ink-2)" }}>{visitas}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Total Exigido</p>
          <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--mode-arq)" }}>
            {total} <span className="text-sm font-medium">unid.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
