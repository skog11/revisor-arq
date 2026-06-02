import { X, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

export interface ContextoProyecto {
  zonaSuelo: "Urbano" | "Rural" | "Extensión Urbana" | "";
  destino: "Residencial" | "Equipamiento" | "Actividad Productiva" | "Infraestructura" | "Espacio Público" | "Área Verde" | "";
  anoOriginal: string;
  leyEspecial: "Ninguna" | "DFL-2" | "Copropiedad Inmobiliaria" | "Ley del Mono (20.898 / 21.141)" | "Monumento Histórico / Inmueble Cons. Histórica" | "";
}

export const CONTEXTO_INICIAL: ContextoProyecto = {
  zonaSuelo: "",
  destino: "",
  anoOriginal: "",
  leyEspecial: "",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contexto: ContextoProyecto;
  onGuardar: (ctx: ContextoProyecto) => void;
}

export function ContextoModal({ isOpen, onClose, contexto, onGuardar }: Props) {
  const [draft, setDraft] = useState<ContextoProyecto>(contexto);

  // Sincronizar draft si se abre/cierra
  useEffect(() => {
    if (isOpen) setDraft(contexto);
  }, [isOpen, contexto]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div 
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl overflow-hidden"
        style={{ 
          background: "var(--paper)", 
          borderColor: "var(--rule)",
        }}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 transition-colors hover:bg-black/5"
        >
          <X className="size-4" style={{ color: "var(--ink-2)" }} />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <SlidersHorizontal className="size-5" style={{ color: "var(--terracotta)" }} />
          <h2 className="text-lg font-serif" style={{ color: "var(--ink)" }}>Contexto del Proyecto</h2>
        </div>
        
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Define los parámetros base de tu proyecto para que la IA realice un cruce normativo preciso, descartando artículos que no aplican a tu caso.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-0.5 block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Límite Urbano (Clasificación de Suelo)</label>
            <p className="mb-2 text-[10px] leading-tight" style={{ color: "var(--ink-4)" }}>Define si el predio está dentro o fuera del límite urbano (No confundir con la Zona específica del PRC, ej: Z-1).</p>
            <select 
              value={draft.zonaSuelo}
              onChange={(e) => setDraft({ ...draft, zonaSuelo: e.target.value as any })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: draft.zonaSuelo ? "var(--ink)" : "var(--ink-4)" }}
            >
              <option value="" disabled>Seleccione...</option>
              <option value="Urbano">Urbano</option>
              <option value="Rural">Rural</option>
              <option value="Extensión Urbana">Extensión Urbana</option>
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Destino Principal de la Edificación</label>
            <p className="mb-2 text-[10px] leading-tight" style={{ color: "var(--ink-4)" }}>Según la clasificación legal de usos de suelo del Art. 2.1.24 de la OGUC.</p>
            <select 
              value={draft.destino}
              onChange={(e) => setDraft({ ...draft, destino: e.target.value as any })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: draft.destino ? "var(--ink)" : "var(--ink-4)" }}
            >
              <option value="" disabled>Seleccione...</option>
              <option value="Residencial">Residencial</option>
              <option value="Equipamiento">Equipamiento</option>
              <option value="Actividad Productiva">Actividad Productiva</option>
              <option value="Infraestructura">Infraestructura</option>
              <option value="Espacio Público">Espacio Público</option>
              <option value="Área Verde">Área Verde</option>
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Año del Permiso Original (Opcional)</label>
            <p className="mb-2 text-[10px] leading-tight" style={{ color: "var(--ink-4)" }}>Crucial para evaluar normas preexistentes (Ej: antes o después de 2001).</p>
            <input 
              type="text" 
              placeholder="Ej: 1995"
              value={draft.anoOriginal}
              onChange={(e) => setDraft({ ...draft, anoOriginal: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: "var(--ink)" }}
            />
          </div>

          <div>
            <label className="mb-0.5 block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Régimen Legal Excepcional</label>
            <p className="mb-2 text-[10px] leading-tight" style={{ color: "var(--ink-4)" }}>Indica si el proyecto se ampara en alguna ley que otorgue beneficios o exenciones.</p>
            <select 
              value={draft.leyEspecial}
              onChange={(e) => setDraft({ ...draft, leyEspecial: e.target.value as any })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ background: "var(--card-bg)", borderColor: "var(--rule-2)", color: draft.leyEspecial ? "var(--ink)" : "var(--ink-4)" }}
            >
              <option value="" disabled>Ninguna o no especificado</option>
              <option value="Ninguna">Ninguna</option>
              <option value="DFL-2">DFL-2 (Vivienda Económica)</option>
              <option value="Copropiedad Inmobiliaria">Copropiedad Inmobiliaria</option>
              <option value="Ley del Mono (20.898 / 21.141)">Ley del Mono (Regularización)</option>
              <option value="Monumento Histórico / Inmueble Cons. Histórica">Patrimonio (MH / ICH)</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "var(--rule-2)" }}>
          <button 
            onClick={() => setDraft(CONTEXTO_INICIAL)}
            className="px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 rounded-full"
            style={{ color: "var(--ink-3)" }}
          >
            Limpiar
          </button>
          <button 
            onClick={() => { onGuardar(draft); onClose(); }}
            className="px-5 py-2 text-sm font-medium rounded-full transition-transform hover:-translate-y-px shadow-sm"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            Guardar Contexto
          </button>
        </div>
      </div>
    </div>
  );
}
