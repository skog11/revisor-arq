"use client";

import { useEffect, useRef, useState } from "react";
import {
  RefreshCw, Database, FileText, CheckCircle2, Clock,
  Upload, Trash2, ToggleLeft, ToggleRight, Loader2, X, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NormaStatus {
  id: string;
  tipo: string;
  numero: string;
  titulo: string;
  total_chunks: number | null;
  fecha_ingesta: string | null;
  fecha_actualizacion: string | null;
  vigente: boolean;
  // Fase 5: metadatos expandidos
  dominio?: string | null;
  subdominio?: string | null;
  organo_emisor?: string | null;
  jerarquia_norm?: string | null;
  etapas_proyecto?: string[];
  alcance?: string | null;
}

interface CorpusStatus {
  totalChunks: number;
  totalNormas: number;
  normas: NormaStatus[];
  timestamp: string;
}

// ─── TipoBadge ────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  const styles: Record<string, string> = {
    LGUC:           "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    OGUC:           "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    DDU:            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    DDU_ESPECIFICA: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  };
  const fallback = "bg-foreground/5 text-foreground/60 border-foreground/10";
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono px-1.5 shrink-0", styles[tipo] ?? fallback)}>
      {tipo.replaceAll("_", " ")}
    </Badge>
  );
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Modal confirmación ───────────────────────────────────────────────────────

function ModalConfirmar({
  norma, onConfirmar, onCancelar, cargando,
}: {
  norma: NormaStatus;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCancelar} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirmar-titulo"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && !cargando && onCancelar()}
        className="relative z-10 w-full max-w-md rounded-xl p-6 space-y-4 shadow-2xl outline-none"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p id="modal-confirmar-titulo" className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
              ¿Eliminar esta norma de la base normativa?
            </p>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Esta acción es irreversible. Se eliminará la norma y todos sus vectores de búsqueda.
            </p>
          </div>
          <button onClick={onCancelar} className="shrink-0 p-1 rounded transition-colors hover:bg-foreground/[0.06]">
            <X className="size-4" style={{ color: "var(--ink-3)" }} />
          </button>
        </div>

        <div
          className="rounded-lg p-3 text-xs space-y-1"
          style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
        >
          <div className="flex items-center gap-2">
            <TipoBadge tipo={norma.tipo} />
            <span className="font-mono" style={{ color: "var(--ink-2)" }}>{norma.numero}</span>
          </div>
          <p style={{ color: "var(--ink-2)" }}>{norma.titulo}</p>
          {norma.total_chunks !== null && (
            <p style={{ color: "var(--ink-4)" }}>{norma.total_chunks} chunks en el índice vectorial</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            size="sm" onClick={onConfirmar} disabled={cargando} className="gap-2"
            style={{ background: "var(--terracotta)", color: "#fff", border: "none" }}
          >
            {cargando && <Loader2 className="size-3.5 animate-spin" />}
            Eliminar definitivamente
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────

const DOMINIOS_OPCIONES = [
  "urbanismo", "medioambiente", "salud", "patrimonio",
  "infraestructura", "energia", "aguas", "defensa", "bienes_nacionales", "otro",
];
const JERARQUIA_OPCIONES = ["ley", "reglamento", "instruccion", "resolucion", "norma_tecnica", "otro"];
const ETAPAS_OPCIONES   = ["diseño", "anteproyecto", "permiso", "obra", "recepcion", "regularizacion"];

function UploadForm({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("");
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [urlFuente, setUrlFuente] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fase, setFase] = useState<"idle" | "extrayendo" | "ingresando" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Metadatos avanzados
  const [mostrarMeta, setMostrarMeta] = useState(false);
  const [dominio, setDominio] = useState("urbanismo");
  const [organoEmisor, setOrganoEmisor] = useState("");
  const [jerarquiaNorm, setJerarquiaNorm] = useState("reglamento");
  const [etapas, setEtapas] = useState<string[]>([]);
  const [alcance, setAlcance] = useState("nacional");

  const cargando = fase === "extrayendo" || fase === "ingresando";

  function toggleEtapa(e: string) {
    setEtapas((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  }

  async function subir() {
    const file = fileRef.current?.files?.[0];
    if (!file || !tipo.trim() || !numero.trim() || !titulo.trim()) return;

    setFase("extrayendo");
    setErrorMsg(null);

    const fd = new FormData();
    fd.append("file", file);
    let texto: string;
    try {
      const r1 = await fetch("/api/corpus/extraer-texto", { method: "POST", body: fd });
      if (!r1.ok) {
        const j = await r1.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error((j as { error?: string }).error ?? `HTTP ${r1.status}`);
      }
      ({ texto } = (await r1.json()) as { texto: string });
    } catch (e) {
      setFase("error");
      setErrorMsg(`Error extrayendo texto: ${(e as Error).message}`);
      return;
    }

    setFase("ingresando");
    try {
      const r2 = await fetch("/api/corpus/ingestar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipo.trim(),
          numero: numero.trim(),
          titulo: titulo.trim(),
          texto,
          url_fuente: urlFuente.trim(),
          dominio,
          organo_emisor: organoEmisor.trim() || undefined,
          jerarquia_norm: jerarquiaNorm,
          etapas_proyecto: etapas,
          alcance,
        }),
      });
      if (!r2.ok) {
        const j = await r2.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error((j as { error?: string }).error ?? `HTTP ${r2.status}`);
      }
    } catch (e) {
      setFase("error");
      setErrorMsg(`Error ingresando norma: ${(e as Error).message}`);
      return;
    }

    setFase("ok");
    setTimeout(() => {
      setFase("idle");
      setTipo(""); setNumero(""); setTitulo("");
      setUrlFuente(""); setFileName(null);
      setDominio("urbanismo"); setOrganoEmisor("");
      setJerarquiaNorm("reglamento"); setEtapas([]); setAlcance("nacional");
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    }, 1500);
  }

  const inputCls = "rounded-md border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] w-full";
  const inputStyle = { borderColor: "var(--rule)", color: "var(--ink)" };
  const selectCls = inputCls;

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
        Subir nueva norma (PDF)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>Tipo</label>
          <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value.toUpperCase())}
            placeholder="ej. LGUC, OGUC, DDU…" disabled={cargando} className={inputCls} style={inputStyle} />
        </div>

        {/* Número */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>Número / clave</label>
          <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)}
            placeholder="ej. 541, DFL-458" disabled={cargando} className={inputCls} style={inputStyle} />
        </div>

        {/* Título */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>Título</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="ej. Ley General de Urbanismo y Construcciones"
            disabled={cargando} className={inputCls} style={inputStyle} />
        </div>

        {/* URL fuente */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>
            URL fuente <span style={{ color: "var(--ink-4)" }}>(opcional)</span>
          </label>
          <input type="url" value={urlFuente} onChange={(e) => setUrlFuente(e.target.value)}
            placeholder="https://www.bcn.cl/leychile/…"
            disabled={cargando} className={inputCls} style={inputStyle} />
        </div>
      </div>

      {/* ── Metadatos avanzados (colapsable) ── */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarMeta((v) => !v)}
          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <span style={{ display: "inline-block", transform: mostrarMeta ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
          Metadatos avanzados
        </button>

        {mostrarMeta && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
            {/* Dominio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--ink-3)" }}>Dominio regulatorio</label>
              <select value={dominio} onChange={(e) => setDominio(e.target.value)} disabled={cargando}
                className={selectCls} style={inputStyle}>
                {DOMINIOS_OPCIONES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Jerarquía */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--ink-3)" }}>Jerarquía normativa</label>
              <select value={jerarquiaNorm} onChange={(e) => setJerarquiaNorm(e.target.value)} disabled={cargando}
                className={selectCls} style={inputStyle}>
                {JERARQUIA_OPCIONES.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            {/* Órgano emisor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--ink-3)" }}>
                Órgano emisor <span style={{ color: "var(--ink-4)" }}>(opcional)</span>
              </label>
              <input type="text" value={organoEmisor} onChange={(e) => setOrganoEmisor(e.target.value)}
                placeholder="ej. MINVU, CMN, DGA…" disabled={cargando} className={inputCls} style={inputStyle} />
            </div>

            {/* Alcance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--ink-3)" }}>Alcance territorial</label>
              <select value={alcance} onChange={(e) => setAlcance(e.target.value)} disabled={cargando}
                className={selectCls} style={inputStyle}>
                {["nacional", "regional", "comunal", "sectorial"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Etapas del proyecto */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs" style={{ color: "var(--ink-3)" }}>
                Etapas del proyecto donde aplica
              </label>
              <div className="flex flex-wrap gap-2">
                {ETAPAS_OPCIONES.map((e) => (
                  <button
                    key={e} type="button"
                    onClick={() => toggleEtapa(e)}
                    disabled={cargando}
                    className="px-2.5 py-1 rounded-full text-[11px] transition-all border"
                    style={{
                      background: etapas.includes(e) ? "color-mix(in srgb, var(--terracotta) 12%, transparent)" : "var(--paper)",
                      borderColor: etapas.includes(e) ? "rgba(198,74,44,0.4)" : "var(--rule)",
                      color: etapas.includes(e) ? "var(--terracotta)" : "var(--ink-3)",
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selector archivo */}
      <div className="flex items-center gap-3 flex-wrap">
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} disabled={cargando} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}
          disabled={cargando} className="gap-2 shrink-0">
          <Upload className="size-3.5" />
          Seleccionar PDF
        </Button>
        {fileName && (
          <span className="text-xs truncate min-w-0" style={{ color: "var(--ink-3)" }}>{fileName}</span>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs" style={{ color: "var(--terracotta)" }}>{errorMsg}</p>
      )}

      <Button
        size="sm" onClick={subir}
        disabled={cargando || !fileName || !tipo.trim() || !numero.trim() || !titulo.trim()}
        className="gap-2 w-full sm:w-auto"
        style={fase === "ok" ? { background: "var(--ra-green)", color: "#fff", border: "none" } : {}}
      >
        {cargando && <Loader2 className="size-3.5 animate-spin" />}
        {fase === "extrayendo" && "Extrayendo texto del PDF…"}
        {fase === "ingresando" && "Generando embeddings y guardando…"}
        {fase === "ok" && "✓ Norma ingresada correctamente"}
        {(fase === "idle" || fase === "error") && "Subir e ingestar"}
      </Button>
    </div>
  );
}

// ─── Tarjeta de norma (móvil) ─────────────────────────────────────────────────

function NormaCard({
  norma,
  toggling,
  eliminando,
  onToggle,
  onEliminar,
}: {
  norma: NormaStatus;
  toggling: string | null;
  eliminando: string | null;
  onToggle: (n: NormaStatus) => void;
  onEliminar: (n: NormaStatus) => void;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-3 transition-opacity"
      style={{
        background: "var(--paper-2)",
        borderColor: "var(--rule)",
        opacity: norma.vigente ? 1 : 0.55,
      }}
    >
      {/* Fila superior: badge + numero + acciones */}
      <div className="flex items-center gap-2">
        <TipoBadge tipo={norma.tipo} />
        <span className="font-mono text-xs flex-1" style={{ color: "var(--ink-2)" }}>
          {norma.numero}
        </span>

        {/* Toggle vigencia */}
        <button
          onClick={() => onToggle(norma)}
          disabled={toggling === norma.id}
          className="flex items-center gap-1 transition-opacity hover:opacity-70 disabled:cursor-wait"
          title={norma.vigente ? "Activa — clic para desactivar" : "Desactivada — clic para activar"}
        >
          {toggling === norma.id ? (
            <Loader2 className="size-4 animate-spin" style={{ color: "var(--ink-3)" }} />
          ) : norma.vigente ? (
            <ToggleRight className="size-5" style={{ color: "var(--ra-green)" }} />
          ) : (
            <ToggleLeft className="size-5" style={{ color: "var(--ink-4)" }} />
          )}
          <span
            className="text-[10px]"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: norma.vigente ? "var(--ra-green)" : "var(--ink-4)",
            }}
          >
            {norma.vigente ? "activa" : "inactiva"}
          </span>
        </button>

        {/* Eliminar */}
        <button
          onClick={() => onEliminar(norma)}
          disabled={eliminando === norma.id}
          className="p-1.5 rounded transition-colors hover:bg-red-500/10 disabled:cursor-wait ml-1"
          title="Eliminar norma y todos sus chunks"
        >
          {eliminando === norma.id ? (
            <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--ink-3)" }} />
          ) : (
            <Trash2 className="size-3.5" style={{ color: "var(--terracotta)" }} />
          )}
        </button>
      </div>

      {/* Título */}
      <p className="text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
        {norma.titulo}
      </p>

      {/* Metadatos fase 5 */}
      {(norma.dominio || norma.jerarquia_norm || norma.organo_emisor) && (
        <div className="flex flex-wrap gap-1.5">
          {norma.dominio && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
              style={{ color: "var(--ink-4)", borderColor: "var(--rule)", fontFamily: "var(--font-jetbrains-mono)", background: "var(--paper)" }}>
              {norma.dominio}
            </span>
          )}
          {norma.jerarquia_norm && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
              style={{ color: "var(--ink-4)", borderColor: "var(--rule)", fontFamily: "var(--font-jetbrains-mono)", background: "var(--paper)" }}>
              {norma.jerarquia_norm}
            </span>
          )}
          {norma.organo_emisor && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
              style={{ color: "var(--ink-4)", borderColor: "var(--rule)", fontFamily: "var(--font-jetbrains-mono)", background: "var(--paper)" }}>
              {norma.organo_emisor}
            </span>
          )}
        </div>
      )}

      {/* Fecha */}
      <p
        className="text-[10px]"
        style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
      >
        Ingesta: {formatFecha(norma.fecha_ingesta ?? norma.fecha_actualizacion)}
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CorpusPage() {
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [confirmarElim, setConfirmarElim] = useState<NormaStatus | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroVigente, setFiltroVigente] = useState<"todos" | "vigentes" | "inactivas">("todos");
  // Paginación
  const PAGE_SIZE = 50;
  const [pagina, setPagina] = useState(1);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corpus/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  // Resetear página cuando cambian los filtros
  useEffect(() => { setPagina(1); }, [busqueda, filtroTipo, filtroVigente]);

  async function toggleVigencia(norma: NormaStatus) {
    if (toggling) return;
    setToggling(norma.id);
    try {
      const res = await fetch("/api/corpus/vigencia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: norma.id, vigente: !norma.vigente }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus((prev) =>
        prev
          ? { ...prev, normas: prev.normas.map((n) => n.id === norma.id ? { ...n, vigente: !norma.vigente } : n) }
          : prev
      );
    } catch {
      await cargar();
    } finally {
      setToggling(null);
    }
  }

  async function confirmarYEliminar() {
    if (!confirmarElim) return;
    const norma = confirmarElim;
    setEliminando(norma.id);
    try {
      const res = await fetch("/api/corpus/eliminar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: norma.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfirmarElim(null);
      await cargar();
    } catch {
      setConfirmarElim(null);
      await cargar();
    } finally {
      setEliminando(null);
    }
  }

  // Tipos únicos para el selector de filtro
  const tiposUnicos = status
    ? Array.from(new Set(status.normas.map((n) => n.tipo))).sort()
    : [];

  const normasFiltradas = status
    ? [...status.normas]
        .filter((n) => {
          if (filtroTipo !== "todos" && n.tipo !== filtroTipo) return false;
          if (filtroVigente === "vigentes" && !n.vigente) return false;
          if (filtroVigente === "inactivas" && n.vigente) return false;
          if (busqueda.trim()) {
            const q = busqueda.toLowerCase();
            return (
              n.numero.toLowerCase().includes(q) ||
              n.titulo.toLowerCase().includes(q) ||
              n.tipo.toLowerCase().includes(q) ||
              (n.dominio ?? "").toLowerCase().includes(q) ||
              (n.organo_emisor ?? "").toLowerCase().includes(q)
            );
          }
          return true;
        })
        .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.numero.localeCompare(b.numero))
    : [];

  const totalPaginas = Math.ceil(normasFiltradas.length / PAGE_SIZE);
  const normasSorted = normasFiltradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  return (
    <>
      {confirmarElim && (
        <ModalConfirmar
          norma={confirmarElim}
          onConfirmar={confirmarYEliminar}
          onCancelar={() => setConfirmarElim(null)}
          cargando={eliminando === confirmarElim.id}
        />
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
            >
              Gestión de normativa
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
              Normas ingresadas en la base de conocimiento con vectores de búsqueda
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline" size="sm"
              onClick={() => setShowUpload((v) => !v)}
              className="gap-2 flex-1 sm:flex-none justify-center"
            >
              <Upload className="size-3.5" />
              {showUpload ? "Ocultar" : "Subir norma"}
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={cargar}
              disabled={loading}
              className="gap-2 flex-1 sm:flex-none justify-center"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ── Upload Form ── */}
        {showUpload && <UploadForm onDone={cargar} />}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
            Error al cargar: {error}
          </div>
        )}

        {/* ── Stats ── */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total chunks",    value: status.totalChunks.toLocaleString("es-CL"), icon: Database },
              { label: "Total normas",    value: status.totalNormas,                          icon: FileText },
              { label: "Normas vigentes", value: status.normas.filter((n) => n.vigente).length, icon: CheckCircle2 },
              { label: "Actualización",   value: formatFecha(status.timestamp),               icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border p-4 space-y-1"
                style={{ background: "var(--paper-2)", borderColor: "var(--rule)" }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5" style={{ color: "var(--ink-3)" }} />
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</span>
                </div>
                <p
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink)" }}
                >
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Barra de filtros ── */}
        {status && status.normas.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Búsqueda */}
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2"
              style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
            >
              <Search className="size-3.5 shrink-0" style={{ color: "var(--ink-3)" }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por número, título, dominio…"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-xs"
                style={{ color: "var(--ink)" }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="shrink-0">
                  <X className="size-3.5" style={{ color: "var(--ink-4)" }} />
                </button>
              )}
            </div>

            {/* Filtro tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="rounded-lg px-3 py-2 text-xs focus:outline-none"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              <option value="todos">Todos los tipos</option>
              {tiposUnicos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Filtro vigencia */}
            <select
              value={filtroVigente}
              onChange={(e) => setFiltroVigente(e.target.value as typeof filtroVigente)}
              className="rounded-lg px-3 py-2 text-xs focus:outline-none"
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                color: "var(--ink-2)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              <option value="todos">Vigentes e inactivas</option>
              <option value="vigentes">Solo vigentes</option>
              <option value="inactivas">Solo inactivas</option>
            </select>
          </div>
        )}

        {/* Resultado del filtro */}
        {status && (busqueda || filtroTipo !== "todos" || filtroVigente !== "todos") && (
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            {normasFiltradas.length} resultado{normasFiltradas.length !== 1 ? "s" : ""}
            {busqueda ? <> para &ldquo;{busqueda}&rdquo;</> : null}
            {totalPaginas > 1 && <> · página {pagina}/{totalPaginas}</>}
          </p>
        )}

        {/* ── Lista normas: tarjetas en móvil, tabla en desktop ── */}
        {status && normasSorted.length > 0 && (
          <>
            {/* MÓVIL: tarjetas */}
            <div className="flex flex-col gap-3 md:hidden">
              {normasSorted.map((n) => (
                <NormaCard
                  key={`${n.tipo}-${n.numero}`}
                  norma={n}
                  toggling={toggling}
                  eliminando={eliminando}
                  onToggle={toggleVigencia}
                  onEliminar={setConfirmarElim}
                />
              ))}
            </div>

            {/* DESKTOP: tabla */}
            <div
              className="hidden md:block rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--rule)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
                    {[
                      { label: "Tipo" },
                      { label: "Número" },
                      { label: "Título" },
                      { label: "Dominio" },
                      { label: "Vigente", title: "Activa en búsquedas" },
                      { label: "Última ingesta" },
                      { label: "" },
                    ].map(({ label, title }) => (
                      <th
                        key={label}
                        className="text-left px-4 py-2.5 text-xs font-medium"
                        style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
                        title={title}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normasSorted.map((n, i) => (
                    <tr
                      key={`${n.tipo}-${n.numero}`}
                      className="transition-colors hover:bg-foreground/[0.02]"
                      style={{
                        borderBottom: i < normasSorted.length - 1 ? "1px solid var(--rule)" : undefined,
                        opacity: n.vigente ? 1 : 0.5,
                      }}
                    >
                      <td className="px-4 py-2.5"><TipoBadge tipo={n.tipo} /></td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--ink-2)" }}>
                        {n.numero}
                      </td>
                      <td
                        className="px-4 py-2.5 text-xs max-w-[200px] truncate"
                        style={{ color: "var(--ink-2)" }}
                        title={n.titulo}
                      >
                        {n.titulo}
                      </td>

                      {/* Dominio + jerarquía */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {n.dominio && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border w-fit"
                              style={{ color: "var(--ink-3)", borderColor: "var(--rule)", fontFamily: "var(--font-jetbrains-mono)", background: "var(--paper)" }}>
                              {n.dominio}
                            </span>
                          )}
                          {n.jerarquia_norm && (
                            <span className="text-[9px]"
                              style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
                              {n.jerarquia_norm}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleVigencia(n)}
                          disabled={toggling === n.id}
                          className="flex items-center gap-1.5 transition-opacity hover:opacity-70 disabled:cursor-wait"
                          title={n.vigente ? "Activa — clic para desactivar" : "Desactivada — clic para activar"}
                        >
                          {toggling === n.id ? (
                            <Loader2 className="size-4 animate-spin" style={{ color: "var(--ink-3)" }} />
                          ) : n.vigente ? (
                            <>
                              <ToggleRight className="size-5" style={{ color: "var(--ra-green)" }} />
                              <span className="text-[10px]" style={{ color: "var(--ra-green)", fontFamily: "var(--font-jetbrains-mono)" }}>
                                activa
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="size-5" style={{ color: "var(--ink-4)" }} />
                              <span className="text-[10px]" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
                                inactiva
                              </span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-3)" }}>
                        {formatFecha(n.fecha_ingesta ?? n.fecha_actualizacion)}
                      </td>

                      {/* Eliminar */}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setConfirmarElim(n)}
                          disabled={eliminando === n.id}
                          className="p-1.5 rounded transition-colors hover:bg-red-500/10 disabled:cursor-wait"
                          title="Eliminar norma y todos sus chunks"
                        >
                          {eliminando === n.id ? (
                            <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--ink-3)" }} />
                          ) : (
                            <Trash2 className="size-3.5" style={{ color: "var(--terracotta)" }} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Paginación ── */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-foreground/[0.06] disabled:opacity-40 disabled:cursor-default"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
              // Mostrar primeras 3, últimas 3 y la actual con sus vecinas
              const p = i + 1;
              if (totalPaginas <= 7) return p;
              if (p <= 2 || p >= totalPaginas - 1 || Math.abs(p - pagina) <= 1) return p;
              return null;
            }).filter(Boolean).reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && (arr[i - 1] as number) < (p as number) - 1) acc.push("…");
              acc.push(p as number);
              return acc;
            }, []).map((p, i) => (
              typeof p === "string" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: "var(--ink-4)" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className="w-8 h-8 rounded-lg text-xs transition-colors"
                  style={{
                    background: pagina === p ? "var(--ink)" : "transparent",
                    color: pagina === p ? "var(--paper)" : "var(--ink-3)",
                    border: `1px solid ${pagina === p ? "var(--ink)" : "var(--rule)"}`,
                    fontFamily: "var(--font-jetbrains-mono)",
                  }}
                >
                  {p}
                </button>
              )
            ))}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-foreground/[0.06] disabled:opacity-40 disabled:cursor-default"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
            >
              Siguiente →
            </button>
          </div>
        )}

        {loading && !status && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="size-5 animate-spin" style={{ color: "var(--ink-3)" }} />
          </div>
        )}
      </div>
    </>
  );
}
