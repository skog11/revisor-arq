"use client";

import { useState } from "react";
import { FileText, X, Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { ConfigPDF, DatosPDF } from "@/lib/generar-pdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generarNumeroInforme(): string {
  const now = new Date();
  const anio = now.getFullYear();
  const mes  = String(now.getMonth() + 1).padStart(2, "0");
  const dia  = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `INF-${anio}${mes}${dia}-${rand}`;
}

// ─── Sub-componente: campo de texto ──────────────────────────────────────────

function Campo({
  label,
  opcional = false,
  value,
  onChange,
  placeholder,
  maxLength = 80,
}: {
  label: string;
  opcional?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest"
        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
      >
        {label}{" "}
        {opcional && <span style={{ color: "var(--ink-4)" }}>(opcional)</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg px-3 py-2.5 text-sm"
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--rule)",
          color: "var(--ink-2)",
          outline: "none",
        }}
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  datos: DatosPDF;
  onCerrar: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalExportarPDF({ datos, onCerrar }: Props) {
  const [tipo,          setTipo]          = useState<ConfigPDF["tipo"]>("tecnico");
  const [nombreProyecto,setNombreProyecto]= useState("");
  const [profesional,   setProfesional]   = useState("");
  const [numeroInforme, setNumeroInforme] = useState(generarNumeroInforme);
  const [rut,           setRut]           = useState("");
  const [registro,      setRegistro]      = useState("");
  const [direccion,     setDireccion]     = useState("");
  const [rol,           setRol]           = useState("");
  const [comuna,        setComuna]        = useState("");
  const [dom,           setDom]           = useState("");
  const [expandido,     setExpandido]     = useState(false);
  const [generando,     setGenerando]     = useState(false);

  async function handleGenerar() {
    setGenerando(true);
    try {
      const { generarPDF } = await import("@/lib/generar-pdf");
      await generarPDF(datos, {
        tipo,
        nombreProyecto,
        profesional,
        numeroInforme,
        rut,
        registro,
        direccion,
        rol,
        comuna,
        dom,
      });
      onCerrar();
    } catch (err) {
      console.error("Error generando PDF:", err);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-xl flex flex-col"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--rule)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
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

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

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
                    borderColor: tipo === t ? "rgba(198,74,44,0.35)" : "var(--rule)",
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

          {/* N° Informe */}
          <Campo
            label="N° Informe"
            value={numeroInforme}
            onChange={setNumeroInforme}
            placeholder="INF-20260101-001"
            maxLength={30}
          />

          {/* Nombre del proyecto */}
          <Campo
            label="Nombre del proyecto"
            opcional
            value={nombreProyecto}
            onChange={setNombreProyecto}
            placeholder="Ej: Edificio residencial Las Condes"
          />

          {/* Profesional */}
          <Campo
            label="Profesional"
            opcional
            value={profesional}
            onChange={setProfesional}
            placeholder="Ej: Arq. María González"
            maxLength={60}
          />

          {/* Sección expandible: datos adicionales */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--rule)" }}
          >
            <button
              onClick={() => setExpandido(!expandido)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
              style={{ background: "var(--paper-2)" }}
            >
              <span
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
              >
                Datos adicionales del proyecto
              </span>
              {expandido
                ? <ChevronUp  className="size-3.5" style={{ color: "var(--ink-4)" }} />
                : <ChevronDown className="size-3.5" style={{ color: "var(--ink-4)" }} />
              }
            </button>

            {expandido && (
              <div className="px-4 pb-4 pt-3 space-y-4" style={{ background: "var(--paper)" }}>
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                  <Campo
                    label="RUT profesional"
                    opcional
                    value={rut}
                    onChange={setRut}
                    placeholder="12.345.678-9"
                    maxLength={12}
                  />
                  <Campo
                    label="N° Registro"
                    opcional
                    value={registro}
                    onChange={setRegistro}
                    placeholder="ARQ-00123"
                    maxLength={20}
                  />
                </div>
                <Campo
                  label="Dirección del proyecto"
                  opcional
                  value={direccion}
                  onChange={setDireccion}
                  placeholder="Av. Providencia 1234, dpto. 5A"
                />
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                  <Campo
                    label="Rol / Predio"
                    opcional
                    value={rol}
                    onChange={setRol}
                    placeholder="1234-5"
                    maxLength={20}
                  />
                  <Campo
                    label="Comuna"
                    opcional
                    value={comuna}
                    onChange={setComuna}
                    placeholder="Providencia"
                    maxLength={40}
                  />
                </div>
                <Campo
                  label="Dirección de Obras (DOM)"
                  opcional
                  value={dom}
                  onChange={setDom}
                  placeholder="DOM Providencia"
                  maxLength={60}
                />
              </div>
            )}
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
            {datos.cruces?.length  ? ` · ${datos.cruces.length} cruce(s) regulatorio(s)` : ""}
            {tipo === "tecnico" ? " (detalle completo)" : " (resumen ejecutivo)"}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0"
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
