"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Database, FileText, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NormaStatus {
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

function TipoBadge({ tipo }: { tipo: string }) {
  const styles: Record<string, string> = {
    LGUC: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    OGUC: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    DDU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    DDU_ESPECIFICA: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono px-1.5", styles[tipo] ?? "")}>
      {tipo.replace("_", " ")}
    </Badge>
  );
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function CorpusPage() {
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corpus/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const normasLGUC = status?.normas.filter((n) => n.tipo === "LGUC") ?? [];
  const normasOGUC = status?.normas.filter((n) => n.tipo === "OGUC") ?? [];
  const normasDDU = status?.normas.filter((n) => n.tipo === "DDU" || n.tipo === "DDU_ESPECIFICA") ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            Estado del corpus
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Normas ingresadas en Supabase con vectores de búsqueda
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={cargar}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
          Error al cargar: {error}
        </div>
      )}

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total chunks", value: status.totalChunks.toLocaleString("es-CL"), icon: Database },
            { label: "Normas activas", value: status.totalNormas, icon: FileText },
            { label: "DDUs cargadas", value: normasDDU.length, icon: CheckCircle2 },
            { label: "Actualización", value: formatFecha(status.timestamp), icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border p-4 space-y-1"
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
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de normas */}
      {status && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--rule)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
                {["Tipo", "Número", "Título", "Chunks", "Última ingesta"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium"
                    style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...normasLGUC, ...normasOGUC, ...normasDDU].map((n, i) => (
                <tr
                  key={`${n.tipo}-${n.numero}`}
                  className="transition-colors hover:bg-foreground/[0.02]"
                  style={{
                    borderBottom: i < status.normas.length - 1 ? "1px solid var(--rule)" : undefined,
                  }}
                >
                  <td className="px-4 py-2.5">
                    <TipoBadge tipo={n.tipo} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--ink-2)" }}>
                    {n.numero}
                  </td>
                  <td className="px-4 py-2.5 text-xs max-w-[260px] truncate" style={{ color: "var(--ink-2)" }}
                    title={n.titulo}>
                    {n.titulo}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-right" style={{ color: "var(--ink-3)" }}>
                    {n.total_chunks ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--ink-3)" }}>
                    {formatFecha(n.fecha_ingesta ?? n.fecha_actualizacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pendientes */}
      {status && normasDDU.length < 16 && (
        <div
          className="rounded-lg border p-4 text-sm space-y-2"
          style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
        >
          <p className="font-medium" style={{ color: "var(--ink-2)" }}>
            ⚠ Corpus incompleto
          </p>
          <p style={{ color: "var(--ink-3)" }}>
            La OGUC y algunas DDUs aún no están ingresadas (límite de cuota diaria de embeddings).
            Ejecuta <code className="text-xs bg-foreground/5 px-1 rounded">npm run corpus:ingest</code> para
            procesar las normas pendientes.
          </p>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs underline underline-offset-2"
            style={{ color: "var(--ink-3)" }}
          >
            Ver en Supabase Dashboard
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {loading && !status && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="size-5 animate-spin" style={{ color: "var(--ink-3)" }} />
        </div>
      )}
    </div>
  );
}
