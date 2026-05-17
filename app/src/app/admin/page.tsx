/**
 * /admin — Panel de analítica administrativa
 * Protegido por middleware (cookie admin_session).
 * Server Component: todas las queries a Supabase ocurren en servidor.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import {
  BarChart2, MessageSquare, Clock, ThumbsUp, ThumbsDown,
  Database, Zap, TrendingUp, BookOpen,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: "Admin — Analítica · REVISOR ARQ",
};

// Sin caché — datos en tiempo real
export const dynamic = "force-dynamic";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMs(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function pct(a: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((a / total) * 100)}%`;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const sb = getSupabaseServiceClient();

  // ── Datos en paralelo ────────────────────────────────────────────────────────
  const [
    { count: totalConsultas },
    { count: totalNormas },
    { count: totalChunks },
    { data: byModo },
    { data: byModelo },
    { data: latencias },
    { data: feedback },
    { data: ultimas },
    { data: porDia },
  ] = await Promise.all([
    sb.from("consultas").select("*", { count: "exact", head: true }),
    sb.from("normas").select("*", { count: "exact", head: true }),
    sb.from("chunks").select("*", { count: "exact", head: true }),
    // Consultas por modo
    sb.from("consultas").select("modo").then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((r) => { counts[r.modo] = (counts[r.modo] ?? 0) + 1; });
      return { data: counts };
    }),
    // Consultas por modelo LLM
    sb.from("consultas").select("modelo").then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((r) => { if (r.modelo) counts[r.modelo] = (counts[r.modelo] ?? 0) + 1; });
      return { data: counts };
    }),
    // Latencia promedio y max (últimas 500)
    sb.from("consultas").select("latencia_ms").not("latencia_ms", "is", null).order("created_at", { ascending: false }).limit(500),
    // Feedback
    sb.from("consultas").select("feedback_thumbs").not("feedback_thumbs", "is", null),
    // Últimas 15 consultas
    sb.from("consultas").select("id, pregunta, modo, modelo, latencia_ms, created_at, feedback_thumbs").order("created_at", { ascending: false }).limit(15),
    // Consultas por día (últimos 14 días)
    sb.from("consultas").select("created_at").gte("created_at", new Date(Date.now() - 14 * 86400_000).toISOString()).order("created_at"),
  ]);

  // ── Calcular métricas ────────────────────────────────────────────────────────
  const latArr = latencias?.map((r) => r.latencia_ms as number).filter(Boolean) ?? [];
  const latProm = latArr.length ? Math.round(latArr.reduce((a, b) => a + b, 0) / latArr.length) : null;
  const latMax  = latArr.length ? Math.max(...latArr) : null;
  const latP90  = latArr.length
    ? latArr.sort((a, b) => a - b)[Math.floor(latArr.length * 0.9)]
    : null;

  const thumbsUp   = feedback?.filter((r) => r.feedback_thumbs === true).length ?? 0;
  const thumbsDown = feedback?.filter((r) => r.feedback_thumbs === false).length ?? 0;
  const totalFb    = thumbsUp + thumbsDown;

  // Agrupar consultas por día
  const diasMap: Record<string, number> = {};
  porDia?.forEach((r) => {
    const dia = (r.created_at as string).slice(0, 10);
    diasMap[dia] = (diasMap[dia] ?? 0) + 1;
  });
  const diasArr = Object.entries(diasMap).sort(([a], [b]) => a.localeCompare(b));
  const maxDia  = Math.max(...diasArr.map(([, v]) => v), 1);

  const modoLabels: Record<string, string> = {
    arquitecto: "Arquitecto",
    abogado:    "Abogado",
    profundo:   "Profundo",
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-5 py-10 sm:px-10" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--ink-4)" }}>
              REVISOR ARQ · ADMIN
            </p>
            <h1
              className="text-2xl font-normal"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
            >
              Analítica del sistema
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/normativa"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-foreground/[0.06]"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)" }}
            >
              <BookOpen className="size-3.5" />
              Corpus
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-foreground/[0.06]"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)" }}
            >
              <MessageSquare className="size-3.5" />
              Chat
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: "Consultas totales",  value: totalConsultas ?? 0, icon: <MessageSquare className="size-4" />, color: "var(--mode-arq)", sub: "histórico" },
            { label: "Normas en corpus",   value: totalNormas ?? 0,    icon: <Database className="size-4" />,      color: "var(--mode-abg)", sub: `${totalChunks?.toLocaleString("es-CL")} chunks` },
            { label: "Latencia P90",       value: fmtMs(latP90),       icon: <Clock className="size-4" />,         color: "var(--mode-pro)", sub: `promedio ${fmtMs(latProm)}` },
            { label: "Satisfacción",       value: totalFb ? `${pct(thumbsUp, totalFb)}` : "—", icon: <TrendingUp className="size-4" />, color: "var(--ra-green)", sub: `${thumbsUp}👍 ${thumbsDown}👎` },
          ] as StatCard[]).map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
            >
              <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                {s.icon}
                <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
                  {s.label}
                </span>
              </div>
              <p className="text-2xl font-normal" style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}>
                {s.value}
              </p>
              {s.sub && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-5)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {s.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Consultas por día — sparkline de barras */}
        <div className="rounded-xl p-5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="size-4" style={{ color: "var(--mode-arq)" }} />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>
              Consultas — últimos 14 días
            </span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {diasArr.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ink-5)" }}>Sin datos.</p>
            ) : (
              diasArr.map(([dia, count]) => (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {count}
                  </span>
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${Math.max(4, (count / maxDia) * 48)}px`,
                      background: "var(--mode-arq)",
                      opacity: 0.7,
                    }}
                    title={`${dia}: ${count} consultas`}
                  />
                  <span className="text-[8px]" style={{ color: "var(--ink-5)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {dia.slice(8)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Distribución modo y modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Por modo */}
          <div className="rounded-xl p-5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--ink-4)" }}>
              Por modo
            </p>
            <div className="space-y-2">
              {Object.entries(byModo as Record<string, number>).sort(([,a],[,b]) => b - a).map(([modo, count]) => {
                const total = totalConsultas ?? 1;
                return (
                  <div key={modo}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--ink-2)" }}>{modoLabels[modo] ?? modo}</span>
                      <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>{count} · {pct(count, total)}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div className="h-full rounded-full" style={{ width: pct(count, total), background: "var(--mode-arq)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por modelo LLM */}
          <div className="rounded-xl p-5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-3.5" style={{ color: "var(--mode-pro)" }} />
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--ink-4)" }}>
                Por modelo LLM
              </p>
            </div>
            <div className="space-y-1.5">
              {Object.entries(byModelo as Record<string, number>).sort(([,a],[,b]) => b - a).map(([modelo, count]) => (
                <div key={modelo} className="flex justify-between text-xs">
                  <span className="truncate max-w-[160px]" style={{ color: "var(--ink-2)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {modelo}
                  </span>
                  <span style={{ color: "var(--ink-4)" }}>{count}</span>
                </div>
              ))}
              {Object.keys(byModelo as Record<string, number>).length === 0 && (
                <p className="text-xs" style={{ color: "var(--ink-5)" }}>Sin datos.</p>
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
        {totalFb > 0 && (
          <div className="rounded-xl p-5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--ink-4)" }}>
              Feedback — {totalFb} valoraciones
            </p>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <ThumbsUp className="size-4" style={{ color: "var(--ra-green)" }} />
                <span className="text-xl font-normal" style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}>
                  {thumbsUp}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-4)" }}>{pct(thumbsUp, totalFb)}</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="size-4" style={{ color: "var(--terracotta)" }} />
                <span className="text-xl font-normal" style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}>
                  {thumbsDown}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-4)" }}>{pct(thumbsDown, totalFb)}</span>
              </div>
              {/* Barra de satisfacción */}
              <div className="flex-1 flex items-center">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: pct(thumbsUp, totalFb), background: "var(--ra-green)", opacity: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Últimas consultas */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--ink-4)" }}>
            Últimas 15 consultas
          </p>
          <div className="space-y-1.5">
            {ultimas?.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5"
                style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: "var(--ink-2)" }}>
                    {c.pregunta}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-mono uppercase" style={{ color: "var(--ink-5)" }}>
                      {modoLabels[c.modo] ?? c.modo}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--ink-5)" }}>
                      {fmtMs(c.latencia_ms)}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--ink-5)" }}>
                      {new Date(c.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                {c.feedback_thumbs === true  && <ThumbsUp   className="size-3.5 shrink-0" style={{ color: "var(--ra-green)" }} />}
                {c.feedback_thumbs === false && <ThumbsDown className="size-3.5 shrink-0" style={{ color: "var(--terracotta)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Latencia detallada */}
        <div className="rounded-xl p-5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-4" style={{ color: "var(--mode-pro)" }} />
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--ink-4)" }}>
              Latencia (últimas 500 consultas)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Promedio", value: fmtMs(latProm) },
              { label: "P90",      value: fmtMs(latP90) },
              { label: "Máximo",   value: fmtMs(latMax) },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-normal" style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}>
                  {s.value}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wide mt-0.5" style={{ color: "var(--ink-5)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
