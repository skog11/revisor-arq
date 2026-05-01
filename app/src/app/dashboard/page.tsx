import { redirect } from "next/navigation";
import { getAuthUser, createClient } from "@/lib/supabase-server";
import { MessageSquare, TrendingUp, Calendar, LogOut } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — REVISOR ARQ",
  description: "Tu historial de consultas y estado de cuenta.",
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Perfil {
  id: string;
  email: string | null;
  nombre: string | null;
  plan: string;
}

interface UsoMensual {
  consultas_este_mes: number;
  limite_mensual: number;
  plan: string;
  porcentaje_uso: number;
}

interface ConsultaReciente {
  id: string;
  pregunta: string;
  modo: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  admin: "Administrador",
  pro:   "Pro",
  beta:  "Beta",
  free:  "Gratuito",
};

const MODO_LABELS: Record<string, string> = {
  arquitecto: "Arquitecto",
  abogado:    "Abogado",
  profundo:   "Profundo",
};

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Perfil del usuario
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, email, nombre, plan")
    .eq("id", user.id)
    .maybeSingle() as { data: Perfil | null };

  // Uso mensual via RPC
  const { data: usoData } = await supabase.rpc("get_uso_mensual", {
    p_user_id: user.id,
  }) as { data: UsoMensual[] | null };
  const uso = usoData?.[0];

  // Últimas 10 consultas
  const { data: consultas } = await supabase
    .from("consultas")
    .select("id, pregunta, modo, created_at")
    .eq("user_id", user.id)
    .order("creado_en", { ascending: false })
    .limit(10) as { data: ConsultaReciente[] | null };

  const mesActual = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="min-h-screen px-5 py-10 sm:px-10" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-normal"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
            >
              {perfil?.nombre ?? user.email?.split("@")[0] ?? "Mi cuenta"}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
              {user.email} · Plan {PLAN_LABELS[perfil?.plan ?? "beta"] ?? perfil?.plan}
            </p>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-foreground/[0.06]"
              style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
            >
              <LogOut className="size-3.5" />
              Salir
            </button>
          </form>
        </div>

        {/* Uso mensual */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4" style={{ color: "var(--ra-green)" }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}>
              Uso — {mesActual}
            </span>
          </div>

          {uso ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span
                  className="text-3xl font-normal"
                  style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
                >
                  {uso.consultas_este_mes}
                </span>
                <span className="mb-1 text-sm" style={{ color: "var(--ink-3)" }}>
                  / {uso.limite_mensual === 999999 ? "∞" : uso.limite_mensual} consultas
                </span>
              </div>

              {uso.limite_mensual !== 999999 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(uso.porcentaje_uso, 100)}%`,
                      background: uso.porcentaje_uso > 90
                        ? "var(--terracotta)"
                        : uso.porcentaje_uso > 70
                        ? "rgb(201,138,31)"
                        : "var(--ra-green)",
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>Sin consultas este mes.</p>
          )}
        </div>

        {/* Consultas recientes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="size-4" style={{ color: "var(--mode-arq, rgb(59,130,246))" }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}>
              Consultas recientes
            </span>
          </div>

          {consultas && consultas.length > 0 ? (
            <div className="space-y-2">
              {consultas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-lg px-4 py-3"
                  style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--ink-2)" }}>
                      {c.pregunta}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        {MODO_LABELS[c.modo] ?? c.modo}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--ink-5)", fontFamily: "var(--font-jetbrains-mono)" }}>
                        {new Date(c.created_at).toLocaleDateString("es-CL", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg px-5 py-8 text-center"
              style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
            >
              <p className="text-sm" style={{ color: "var(--ink-4)" }}>
                No tienes consultas aún.{" "}
                <Link href="/chat" className="underline underline-offset-2 hover:opacity-70">
                  Hacer una consulta →
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <Link
            href="/chat"
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            Nueva consulta
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl px-5 py-2.5 text-sm transition-colors hover:bg-foreground/[0.05]"
            style={{
              border: "1px solid var(--rule)",
              color: "var(--ink-3)",
            }}
          >
            Ver planes
          </Link>
        </div>

      </div>
    </div>
  );
}
