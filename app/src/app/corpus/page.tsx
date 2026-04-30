"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Database, FileText, Clock,
  Trash2, Plus, X, Upload, AlertTriangle, CheckCircle2, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NormaStatus {
  id?: string;
  tipo: string;
  numero: string;
  titulo: string;
  total_chunks: number | null;
  fecha_ingesta: string | null;
  fecha_actualizacion: string | null;
  vigente: boolean;
}

interface CorpusStatus {
  totalChunks: number;
  totalNormas: number;
  normas: NormaStatus[];
  timestamp: string;
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function TipoBadge({ tipo }: { tipo: string }) {
  const colores: Record<string, { bg: string; color: string }> = {
    LGUC: { bg: "var(--mode-arq-soft)", color: "var(--mode-arq)" },
    OGUC: { bg: "var(--mode-pro-soft)", color: "var(--mode-pro)" },
    DDU:  { bg: "var(--mode-abg-soft)", color: "var(--mode-abg)" },
    DDU_ESPECIFICA: { bg: "var(--mode-abg-soft)", color: "var(--mode-abg)" },
  };
  const estilo = colores[tipo] ?? { bg: "var(--paper-3)", color: "var(--ink-3)" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
      style={{
        background: estilo.bg, color: estilo.color,
        fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.04em",
      }}
    >
      {tipo.replace("_", " ")}
    </span>
  );
}

interface FormAgregar {
  tipo: string; numero: string; titulo: string; texto: string; url: string;
}
const FORM_VACIO: FormAgregar = { tipo: "", numero: "", titulo: "", texto: "", url: "" };
type EstadoIngesta = "idle" | "leyendo" | "cargando" | "ok" | "error";

function ModalAgregar({ onClose, onExito }: { onClose: () => void; onExito: () => void }) {
  const [form, setForm] = useState<FormAgregar>(FORM_VACIO);
  const [estado, setEstado] = useState<EstadoIngesta>("idle");
  const [resultado, setResultado] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");

  const set = (key: keyof FormAgregar, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function cargarArchivo(archivo: File) {
    setEstado("leyendo");
    setNombreArchivo(archivo.name);
    try {
      const fd = new FormData();
      fd.append("file", archivo);
      const res = await fetch("/api/corpus/extraer-texto", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setEstado("error"); setResultado(data.error ?? "Error al leer el archivo"); return; }
      set("texto", data.texto);
      setEstado("idle");
    } catch (e) {
      setEstado("error");
      setResultado((e as Error).message);
    }
  }

  async function ingestar() {
    if (!form.tipo || !form.numero || !form.titulo || !form.texto) return;
    setEstado("cargando"); setResultado("");
    try {
      const res = await fetch("/api/corpus/ingestar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setEstado("error"); setResultado(data.error ?? "Error"); return; }
      setEstado("ok");
      setResultado(
        `Ingesta completada: ${data.insertados} de ${data.totalChunks} chunks indexados.` +
        (data.errores?.length ? ` (${data.errores.length} errores parciales)` : "")
      );
      setTimeout(() => { onClose(); onExito(); }, 1800);
    } catch (e) {
      setEstado("error"); setResultado((e as Error).message);
    }
  }

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "7px 10px", fontSize: 13, borderRadius: 6,
    border: "1px solid var(--rule-2)", background: "var(--paper-2)",
    color: "var(--ink)", outline: "none",
  };
  const labelBase: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: "var(--ink-3)",
    letterSpacing: "0.04em", textTransform: "uppercase",
    marginBottom: 4, display: "block",
  };
  const ocupado = estado === "cargando" || estado === "leyendo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", boxShadow: "var(--shadow-3)" }}>

        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-2.5">
            <Upload className="size-4" style={{ color: "var(--mode-arq)" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-instrument-serif)" }}>
              Agregar normativa
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-foreground/[0.06]">
            <X className="size-4" style={{ color: "var(--ink-3)" }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelBase}>Tipo</label>
              <input style={inputBase} placeholder="LGUC, OGUC, DDU, SECTORIAL…"
                value={form.tipo} onChange={(e) => set("tipo", e.target.value)} disabled={ocupado} />
            </div>
            <div>
              <label style={labelBase}>Número / Código</label>
              <input style={inputBase} placeholder="ej. 21.450 o DDU-85"
                value={form.numero} onChange={(e) => set("numero", e.target.value)} disabled={ocupado} />
            </div>
          </div>

          <div>
            <label style={labelBase}>Título</label>
            <input style={inputBase} placeholder="Nombre completo de la normativa"
              value={form.titulo} onChange={(e) => set("titulo", e.target.value)} disabled={ocupado} />
          </div>

          <div>
            <label style={labelBase}>URL fuente <span style={{ color: "var(--ink-5)" }}>(opcional)</span></label>
            <input style={inputBase} placeholder="https://www.bcn.cl/..."
              value={form.url} onChange={(e) => set("url", e.target.value)} disabled={ocupado} />
          </div>

          {/* Zona de texto + upload de archivo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label style={labelBase}>Texto completo</label>
              <label
                className="flex items-center gap-1.5 cursor-pointer rounded-md px-2.5 py-1 text-[11px] transition-colors hover:bg-foreground/[0.06]"
                style={{ border: "1px solid var(--rule)", color: "var(--ink-3)", background: "var(--card-bg)" }}
              >
                <Paperclip className="size-3" />
                {nombreArchivo || "Subir archivo"}
                <input
                  type="file" accept=".pdf,.txt,.md" className="hidden"
                  disabled={ocupado}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) cargarArchivo(f); }}
                />
              </label>
            </div>
            {estado === "leyendo" ? (
              <div className="flex items-center gap-2 rounded-lg px-3 py-3"
                style={{ background: "var(--mode-arq-soft)", border: "1px solid var(--mode-arq-border)" }}>
                <RefreshCw className="size-4 shrink-0 animate-spin" style={{ color: "var(--mode-arq)" }} />
                <p style={{ fontSize: 12, color: "var(--mode-arq)" }}>Extrayendo texto del documento…</p>
              </div>
            ) : (
              <textarea
                style={{ ...inputBase, minHeight: 120, resize: "vertical", lineHeight: 1.5 }}
                placeholder="Pega el texto íntegro, o sube un archivo .pdf / .txt arriba."
                value={form.texto} onChange={(e) => set("texto", e.target.value)} disabled={ocupado}
              />
            )}
            {form.texto.length > 0 && estado !== "leyendo" && (
              <p style={{ fontSize: 10, color: "var(--ink-5)", marginTop: 3 }}>
                {form.texto.length.toLocaleString("es-CL")} caracteres · aprox. {Math.ceil(form.texto.length / 520)} chunks
              </p>
            )}
          </div>

          {(estado === "cargando" || estado === "ok" || estado === "error") && (
            <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3"
              style={{
                background: estado === "ok" ? "var(--mode-pro-soft)" : estado === "error" ? "var(--terracotta-soft)" : "var(--mode-arq-soft)",
                border: `1px solid ${estado === "ok" ? "var(--mode-pro-border)" : estado === "error" ? "rgba(184,69,48,0.20)" : "var(--mode-arq-border)"}`,
              }}>
              {estado === "cargando" && <RefreshCw className="size-4 shrink-0 animate-spin mt-0.5" style={{ color: "var(--mode-arq)" }} />}
              {estado === "ok" && <CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: "var(--mode-pro)" }} />}
              {estado === "error" && <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "var(--terracotta)" }} />}
              <p style={{ fontSize: 12, color: estado === "ok" ? "var(--mode-pro)" : estado === "error" ? "var(--terracotta)" : "var(--mode-arq)" }}>
                {estado === "cargando" ? "Generando embeddings e indexando chunks…" : resultado}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <button onClick={onClose} disabled={ocupado}
            className="px-3.5 py-1.5 rounded-md text-sm transition-colors hover:bg-foreground/[0.06]"
            style={{ color: "var(--ink-3)" }}>
            Cancelar
          </button>
          <button
            onClick={ingestar}
            disabled={ocupado || !form.tipo || !form.numero || !form.titulo || !form.texto}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--ink)", color: "var(--paper)" }}>
            {estado === "cargando" ? "Indexando…" : "Ingestar normativa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEliminar({ norma, onClose, onExito }: { norma: NormaStatus; onClose: () => void; onExito: () => void }) {
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  async function eliminar() {
    if (!norma.id) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/corpus/eliminar?id=${norma.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); setEliminando(false); return; }
      onClose(); onExito();
    } catch (e) { setError((e as Error).message); setEliminando(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", boxShadow: "var(--shadow-3)" }}>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0" style={{ color: "var(--terracotta)" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>Eliminar normativa</p>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Confirma que desea eliminar{" "}
            <strong style={{ color: "var(--ink)" }}>{norma.tipo} {norma.numero}</strong>
            {" "}y todos sus chunks. Esta acción no se puede deshacer.
          </p>
          {error && <p style={{ fontSize: 12, color: "var(--terracotta)" }}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <button onClick={onClose} disabled={eliminando}
            className="px-3.5 py-1.5 rounded-md text-sm transition-colors hover:bg-foreground/[0.06]"
            style={{ color: "var(--ink-3)" }}>Cancelar</button>
          <button onClick={eliminar} disabled={eliminando}
            className="px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--terracotta)", color: "#fff" }}>
            {eliminando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NormativaPage() {
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [modalAgregar, setModalAgregar] = useState(false);
  const [normaAEliminar, setNormaAEliminar] = useState<NormaStatus | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/corpus/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function toggleVigencia(norma: NormaStatus) {
    if (!norma.id) return;
    setToggling(norma.id);
    try {
      const nueva = !norma.vigente;
      await fetch(`/api/corpus/vigencia?id=${norma.id}&vigente=${nueva}`, { method: "PATCH" });
      // Actualizar localmente sin recargar
      setStatus((prev) => prev
        ? { ...prev, normas: prev.normas.map((n) => n.id === norma.id ? { ...n, vigente: nueva } : n) }
        : prev
      );
    } finally { setToggling(null); }
  }

  const tiposDisponibles = status
    ? ["todos", ...Array.from(new Set(status.normas.map((n) => n.tipo))).sort()]
    : ["todos"];

  const normasFiltradas = status
    ? filtroTipo === "todos" ? status.normas : status.normas.filter((n) => n.tipo === filtroTipo)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{
            fontFamily: "var(--font-instrument-serif)",
            fontSize: "clamp(22px, 2.8vw, 30px)",
            fontWeight: 400, letterSpacing: "-0.01em",
            color: "var(--ink)", lineHeight: 1.2,
          }}>Normativa</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
            Cuerpos normativos indexados para búsqueda semántica
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={cargar} disabled={loading}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors hover:bg-foreground/[0.05]"
            style={{ border: "1px solid var(--rule-2)", color: "var(--ink-3)", background: "var(--card-bg)" }}>
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Actualizar
          </button>
          <button onClick={() => setModalAgregar(true)}
            className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-medium"
            style={{ background: "var(--ink)", color: "var(--paper)" }}>
            <Plus className="size-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border p-3.5 text-sm flex items-center gap-2"
          style={{ borderColor: "rgba(184,69,48,0.20)", background: "var(--terracotta-soft)", color: "var(--terracotta)" }}>
          <AlertTriangle className="size-4 shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-3 overflow-hidden rounded-lg" style={{ border: "1px solid var(--rule)" }}>
          {[
            { label: "Total chunks",   val: status.totalChunks.toLocaleString("es-CL"), Icon: Database },
            { label: "Normas activas", val: String(status.normas.filter((n) => n.vigente).length), Icon: FileText },
            { label: "Última carga",   val: formatFecha(status.timestamp), Icon: Clock },
          ].map(({ label, val, Icon }, i, arr) => (
            <div key={label}
              className={cn("flex items-center gap-3 px-4 py-3.5", i < arr.length - 1 && "border-b sm:border-b-0 sm:border-r")}
              style={{ background: "var(--card-bg)", borderColor: "var(--rule)" }}>
              <Icon className="size-4 shrink-0" style={{ color: "var(--ink-4)" }} />
              <div>
                <p style={{ fontSize: 17, fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink)", lineHeight: 1 }}>{val}</p>
                <p style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {status && tiposDisponibles.length > 2 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ fontSize: 10.5, color: "var(--ink-4)", marginRight: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Filtrar:
          </span>
          {tiposDisponibles.map((tipo) => {
            const activo = filtroTipo === tipo;
            return (
              <button key={tipo} onClick={() => setFiltroTipo(tipo)}
                className="rounded-md px-2.5 py-1 text-[11px] transition-colors"
                style={{
                  background: activo ? "var(--ink)" : "var(--card-bg)",
                  color: activo ? "var(--paper)" : "var(--ink-3)",
                  border: `1px solid ${activo ? "transparent" : "var(--rule)"}`,
                  fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.04em",
                }}>
                {tipo === "todos" ? "Todos" : tipo.replace("_", " ")}
                {tipo !== "todos" && (
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>
                    {status.normas.filter((n) => n.tipo === tipo).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tabla */}
      {status && normasFiltradas.length > 0 && (
        <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: "1px solid var(--rule)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
                {["Activo", "Tipo", "Número", "Título / Descripción", "Ingesta", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5"
                    style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normasFiltradas.map((n, i) => (
                <tr key={`${n.tipo}-${n.numero}-${i}`}
                  className="group transition-colors hover:bg-foreground/[0.02]"
                  style={{
                    borderBottom: i < normasFiltradas.length - 1 ? "1px solid var(--rule)" : undefined,
                    opacity: n.vigente ? 1 : 0.45,
                  }}>
                  {/* Toggle activo/inactivo */}
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleVigencia(n)}
                      disabled={toggling === n.id}
                      title={n.vigente ? "Desactivar norma" : "Activar norma"}
                      className="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-50"
                      style={{ background: n.vigente ? "var(--mode-pro)" : "var(--rule-2)" }}
                    >
                      <span
                        className="pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200"
                        style={{
                          margin: "0.5px",
                          transform: n.vigente ? "translateX(12px)" : "translateX(0px)",
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-2.5"><TipoBadge tipo={n.tipo} /></td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-2)", fontFamily: "var(--font-jetbrains-mono)" }}>{n.numero}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-2)", maxWidth: 320 }}>
                    <span className="line-clamp-2" title={n.titulo}>{n.titulo}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-4)", whiteSpace: "nowrap" }}>
                    {formatFecha(n.fecha_ingesta ?? n.fecha_actualizacion)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setNormaAEliminar(n)}
                      className="rounded p-1 opacity-30 group-hover:opacity-100 transition-opacity hover:bg-foreground/[0.06] sm:opacity-0"
                      title="Eliminar">
                      <Trash2 className="size-3.5" style={{ color: "var(--terracotta)" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estado vacío */}
      {status && normasFiltradas.length === 0 && (
        <div className="rounded-lg border flex flex-col items-center justify-center py-14 gap-3"
          style={{ borderColor: "var(--rule)", background: "var(--card-bg)" }}>
          <FileText className="size-8" style={{ color: "var(--ink-5)" }} />
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
            {filtroTipo === "todos" ? "No hay normativas cargadas aún." : `No hay normativas de tipo "${filtroTipo}".`}
          </p>
          {filtroTipo === "todos" && (
            <button onClick={() => setModalAgregar(true)}
              className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-medium mt-1"
              style={{ background: "var(--ink)", color: "var(--paper)" }}>
              <Plus className="size-3.5" />Agregar primera normativa
            </button>
          )}
        </div>
      )}

      {loading && !status && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="size-5 animate-spin" style={{ color: "var(--ink-4)" }} />
        </div>
      )}

      {modalAgregar && <ModalAgregar onClose={() => setModalAgregar(false)} onExito={cargar} />}
      {normaAEliminar && <ModalEliminar norma={normaAEliminar} onClose={() => setNormaAEliminar(null)} onExito={cargar} />}
    </div>
  );
}
