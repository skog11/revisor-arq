"use client";

// modal-descarga-pdf.tsx
// Modal previo a la generación del PDF: captura datos del profesional
// y dispara la descarga del informe.

import { useState } from "react";
import { X, FileDown, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InformePDFDoc, type DatosInforme } from "./informe-pdf";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModalDescargaPDFProps {
  contenido: string;       // Markdown completo del Modo Profundo
  tituloConsulta: string;  // Primeros 80 chars de la pregunta del usuario
  onClose: () => void;
}

// ─── Estilos inline reutilizables ─────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  fontSize: 13,
  borderRadius: 7,
  border: "1px solid var(--rule-2)",
  background: "var(--paper-2)",
  color: "var(--ink)",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--ink-3)",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
  display: "block",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalDescargaPDF({ contenido, tituloConsulta, onClose }: ModalDescargaPDFProps) {
  const [nombreProfesional, setNombreProfesional] = useState("");
  const [nombreProyecto,    setNombreProyecto]    = useState("");
  const [nombreCliente,     setNombreCliente]     = useState("");
  const [rutColegiado,      setRutColegiado]      = useState("");
  const [generando,         setGenerando]         = useState(false);
  const [error,             setError]             = useState("");

  async function generarYDescargar() {
    if (!nombreProfesional.trim()) return;
    setGenerando(true);
    setError("");

    try {
      const datos: DatosInforme = {
        contenido,
        tituloConsulta: tituloConsulta.slice(0, 100),
        nombreProfesional: nombreProfesional.trim(),
        nombreProyecto:    nombreProyecto.trim()  || undefined,
        nombreCliente:     nombreCliente.trim()   || undefined,
        rutColegiado:      rutColegiado.trim()    || undefined,
        fechaConsulta:     new Date(),
      };

      const blob = await pdf(<InformePDFDoc datos={datos} />).toBlob();

      const ts = Date.now().toString().slice(-6);
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `REVISOR-ARQ-INF-${ts}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(`Error al generar el PDF: ${(err as Error).message}`);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background:   "var(--paper)",
          border:       "1px solid var(--rule)",
          boxShadow:    "var(--shadow-3, 0 20px 60px rgba(0,0,0,0.18))",
        }}
      >
        {/* Cabecera */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--rule)" }}
        >
          <div className="flex items-center gap-2.5">
            <FileDown className="size-4" style={{ color: "var(--mode-pro, #2c6e49)" }} />
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-instrument-serif)",
              }}
            >
              Generar informe PDF
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-foreground/[0.06]"
          >
            <X className="size-4" style={{ color: "var(--ink-3)" }} />
          </button>
        </div>

        {/* Formulario */}
        <div className="px-5 py-5 space-y-4">
          <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Los datos que ingreses aparecerán en la portada del informe.
            Solo el nombre del profesional es obligatorio.
          </p>

          {/* Nombre del profesional (requerido) */}
          <div>
            <label style={labelBase}>
              Nombre del profesional o estudio{" "}
              <span style={{ color: "var(--terracotta)" }}>*</span>
            </label>
            <input
              type="text"
              value={nombreProfesional}
              onChange={(e) => setNombreProfesional(e.target.value)}
              placeholder="Ej. Arq. Juan Pérez / Estudio Pérez & Asociados"
              style={inputBase}
              disabled={generando}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && !generando && generarYDescargar()}
            />
          </div>

          {/* Proyecto */}
          <div>
            <label style={labelBase}>
              Nombre del proyecto{" "}
              <span style={{ color: "var(--ink-5)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              placeholder="Ej. Edificio Residencial Las Condes"
              style={inputBase}
              disabled={generando}
            />
          </div>

          {/* Cliente */}
          <div>
            <label style={labelBase}>
              Cliente o destinatario{" "}
              <span style={{ color: "var(--ink-5)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder="Ej. Inmobiliaria XYZ S.A."
              style={inputBase}
              disabled={generando}
            />
          </div>

          {/* RUT / colegiado */}
          <div>
            <label style={labelBase}>
              RUT o N° colegiado{" "}
              <span style={{ color: "var(--ink-5)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={rutColegiado}
              onChange={(e) => setRutColegiado(e.target.value)}
              placeholder="Ej. 12.345.678-9 o CAA-00123"
              style={inputBase}
              disabled={generando}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: "var(--terracotta)" }}>{error}</p>
          )}
        </div>

        {/* Acciones */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5"
          style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}
        >
          <button
            onClick={onClose}
            disabled={generando}
            className="px-4 py-1.5 rounded-lg text-sm transition-colors hover:bg-foreground/[0.06] disabled:opacity-40"
            style={{ color: "var(--ink-3)" }}
          >
            Cancelar
          </button>
          <button
            onClick={generarYDescargar}
            disabled={generando || !nombreProfesional.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "var(--ink)", color: "var(--paper)", border: "none" }}
          >
            {generando ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Generando PDF…
              </>
            ) : (
              <>
                <FileDown className="size-3.5" />
                Generar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
