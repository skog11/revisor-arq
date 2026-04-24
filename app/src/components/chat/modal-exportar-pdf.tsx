"use client";

import { useState } from "react";
import { FileText, X, Download, Loader2 } from "lucide-react";
import type { ConfigPDF, DatosPDF } from "@/lib/generar-pdf";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  datos: DatosPDF;
  onCerrar: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalExportarPDF({ datos, onCerrar }: Props) {
  const [tipo, setTipo] = useState<ConfigPDF["tipo"]>("tecnico");
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [profesional, setProfesional] = useState("");
  const [generando, setGenerando] = useState(false);

  async function handleGenerar() {
    setGenerando(true);
    try {
      // Importación dinámica para no aumentar el bundle inicial
      const { generarPDF } = await import("@/lib/generar-pdf");
      await generarPDF(datos, { tipo, nombreProyecto, profesional });
      onCerrar();
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setGenerando(false);
    }
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-xl"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--rule)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--rule)" }}
        >
          <div className="flex items-center gap-2.5">
            <FileText className="size-4" style={{ color: "var(--terracotta)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--ink)", fontFamily: "var(--font-instrument-serif)", fontSize: 17 }}
            >
              Exportar informe PDF
            </h2>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg p-1.5 transition-colors hover:bg-foreground/[0.06]"
            aria-label="Cerrar"
          >
            <X className="size-4" style={{ color: "var(--ink-3)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Tipo de informe */}
          <div>
            <label
              className="mb-2 block text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
            >
              Tipo de informe
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["ejecutivo", "tecnico"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  aria-pressed={tipo === t}
                  className="rounded-xl border p-3.5 text-left transition-all"
                  style={{
                    background: tipo === t ? "var(--terracotta-soft)" : "var(--paper-2)",
                    borderColor:
                      tipo === t
                        ? "rgba(198,74,44,0.35)"
                        : "var(--rule)",
                    boxShadow: tipo === t ? "var(--shadow-1)" : "none",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold mb-0.5"
                    style={{
                      color: tipo === t ? "var(--terracotta)" : "var(--ink)",
                      fontFamily: "var(--font-jetbrains-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t === "ejecutivo" ? "Ejecutivo" : "Técnico"}
                  </p>
                  <p className="text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
                    {t === "ejecutivo"
                      ? "Resumen conciso para presentar a directivos o mandantes"
                      : "Incluye fuentes, cruces normativos y metadatos completos"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre del proyecto */}
          <div>
            <label
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
            >
              Nombre del proyecto{" "}
              <span style={{ color: "var(--ink-4)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              placeholder="Ej: Edificio residencial Las Condes"
              maxLength={80}
              className="w-full rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
                outline: "none",
              }}
            />
          </div>

          {/* Profesional */}
          <div>
            <label
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
            >
              Profesional{" "}
              <span style={{ color: "var(--ink-4)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={profesional}
              onChange={(e) => setProfesional(e.target.value)}
              placeholder="Ej: Arq. María González"
              maxLength={60}
              className="w-full rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
                outline: "none",
              }}
            />
          </div>

          {/* Preview del contenido */}
          <div
            className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
              color: "var(--ink-3)",
            }}
          >
            <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Incluirá:</span>{" "}
            consulta · respuesta en modo {datos.modoLabel}
            {datos.fuentes?.length ? ` · ${datos.fuentes.length} fuente(s)` : ""}
            {datos.cruces?.length ? ` · ${datos.cruces.length} cruce(s) regulatorio(s)` : ""}
            {tipo === "tecnico" ? " (detalle completo)" : " (resumen ejecutivo)"}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: "var(--rule)" }}
        >
          <button
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-foreground/[0.06]"
            style={{ color: "var(--ink-3)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{
              background: "var(--terracotta)",
              color: "white",
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.04em",
            }}
          >
            {generando ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {generando ? "Generando…" : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
