"use client";

import { useEffect, useRef, useState } from "react";
import {
  RefreshCw, Database, FileText, CheckCircle2, Clock,
  Upload, Trash2, ToggleLeft, ToggleRight, Loader2, X,
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCancelar} />
      <div
        className="relative z-10 w-full max-w-md rounded-xl p-6 space-y-4 shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
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

function UploadForm({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("");
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [urlFuente, setUrlFuente] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fase, setFase] = useState<"idle" | "extrayendo" | "ingresando" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargando = fase === "extrayendo" || fase === "ingresando";

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
      setTipo("");
      setNumero("");
      setTitulo("");
      setUrlFuente("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    }, 1500);
  }

  const inputCls = "rounded-md border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] w-full";
  const inputStyle = { borderColor: "var(--rule)", color: "var(--ink)" };

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
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value.toUpperCase())}
            placeholder="ej. LGUC, OGUC, DDU…"
            disabled={cargando}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Número */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>Número / clave</label>
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="ej. 541, DFL-458"
            disabled={cargando}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Título */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="ej. Ley General de Urbanismo y Construcciones"
            disabled={cargando}
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* URL fuente */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs" style={{ color: "var(--ink-3)" }}>URL fuente <span style={{ color: "var(--ink-4)" }}>(opcional)</span></label>
          <input
            type="url"
            value={urlFuente}
            onChange={(e) => setUrlFuente(e.target.value)}
            placeholder="https://www.bcn.cl/leychile/…"
            disabled={cargando}
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Selector archivo */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          disabled={cargando}
        />
        <Button
          variant="outline" size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={cargando}
          className="gap-2 shrink-0"
        >
          <Upload className="size-3.5" />
          Seleccionar PDF
        </Button>
        {fileName && (
          <span className="text-xs truncate min-w-0" style={{ color: "var(--ink-3)" }}>
            {fileName}
          </span>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs" style={{ color: "var(--terracotta)" }}>{errorMsg}</p>
      )}

      <Button
        size="sm"
        onClick={subir}
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

  const normasSorted = status
    ? [...status.normas].sort((a, b) =>
        a.tipo.localeCompare(b.tipo) || a.numero.localeCompare(b.numero)
      )
    : [];

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
                        className="px-4 py-2.5 text-xs max-w-[220px] truncate"
                        style={{ color: "var(--ink-2)" }}
                        title={n.titulo}
                      >
                        {n.titulo}
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

        {loading && !status && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="size-5 animate-spin" style={{ color: "var(--ink-3)" }} />
          </div>
        )}
      </div>
    </>
  );
}
