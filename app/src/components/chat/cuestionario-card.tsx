"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export interface PreguntaCuestionario {
  id: string;
  texto: string;
  tipo: "opciones" | "texto";
  opciones?: string[];
  placeholder?: string;
}

export interface CuestionarioData {
  titulo: string;
  descripcion: string;
  preguntas: PreguntaCuestionario[];
}

interface Props {
  data: CuestionarioData;
  onSubmit: (respuestasTexto: string) => void;
  accentColor?: string;
}

export function CuestionarioCard({ data, onSubmit, accentColor = "var(--terracotta)" }: Props) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(false);

  const todasRespondidas = data.preguntas.every((p) => {
    const r = respuestas[p.id];
    return r && r.trim().length > 0;
  });

  function handleSubmit() {
    if (!todasRespondidas || enviado) return;
    setEnviado(true);

    // Formatea las respuestas como texto para inyectar en el próximo mensaje
    const resumenRespuestas = data.preguntas
      .map((p) => `- ${p.texto}\n  → ${respuestas[p.id]}`)
      .join("\n");

    onSubmit(resumenRespuestas);
  }

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        border: `1px solid color-mix(in srgb, ${accentColor} 25%, var(--rule))`,
        background: `color-mix(in srgb, ${accentColor} 4%, var(--paper-2))`,
      }}
    >
      {/* Cabecera */}
      <div
        className="px-4 py-3"
        style={{
          borderBottom: `1px solid color-mix(in srgb, ${accentColor} 20%, var(--rule))`,
          background: `color-mix(in srgb, ${accentColor} 7%, var(--paper-2))`,
        }}
      >
        <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
          {data.titulo}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {data.descripcion}
        </p>
      </div>

      {/* Preguntas */}
      <div className="px-4 py-4 flex flex-col gap-5">
        {data.preguntas.map((pregunta, i) => (
          <div key={pregunta.id}>
            {/* Enunciado */}
            <p
              className="text-xs font-medium mb-2 leading-snug"
              style={{ color: "var(--ink-2)" }}
            >
              <span
                className="inline-flex size-4 items-center justify-center rounded-full text-[9px] font-bold mr-1.5"
                style={{ background: accentColor, color: "#fff" }}
              >
                {i + 1}
              </span>
              {pregunta.texto}
            </p>

            {/* Opciones */}
            {pregunta.tipo === "opciones" && pregunta.opciones && (
              <div className="flex flex-wrap gap-1.5">
                {pregunta.opciones.map((op) => {
                  const seleccionada = respuestas[pregunta.id] === op;
                  return (
                    <button
                      key={op}
                      onClick={() =>
                        setRespuestas((prev) => ({ ...prev, [pregunta.id]: op }))
                      }
                      disabled={enviado}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{
                        background: seleccionada
                          ? accentColor
                          : "var(--card-bg)",
                        color: seleccionada ? "#fff" : "var(--ink-2)",
                        border: seleccionada
                          ? `1px solid ${accentColor}`
                          : "1px solid var(--rule-2)",
                        fontWeight: seleccionada ? 500 : 400,
                      }}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Texto libre */}
            {pregunta.tipo === "texto" && (
              <input
                type="text"
                disabled={enviado}
                placeholder={pregunta.placeholder ?? "Escribe aquí..."}
                value={respuestas[pregunta.id] ?? ""}
                onChange={(e) =>
                  setRespuestas((prev) => ({
                    ...prev,
                    [pregunta.id]: e.target.value,
                  }))
                }
                className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--rule-2)",
                  color: "var(--ink)",
                }}
              />
            )}
          </div>
        ))}

        {/* Submit */}
        {!enviado ? (
          <button
            onClick={handleSubmit}
            disabled={!todasRespondidas}
            className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-xs font-semibold transition-all"
            style={{
              background: todasRespondidas ? accentColor : "var(--card-bg)",
              color: todasRespondidas ? "#fff" : "var(--ink-4)",
              border: todasRespondidas
                ? "none"
                : "1px solid var(--rule-2)",
              opacity: todasRespondidas ? 1 : 0.6,
            }}
          >
            Continuar con esta información
            <ChevronRight className="size-3.5" />
          </button>
        ) : (
          <p
            className="text-center text-xs py-1"
            style={{ color: "var(--ink-4)" }}
          >
            ✓ Respuestas enviadas — analizando…
          </p>
        )}
      </div>
    </div>
  );
}
