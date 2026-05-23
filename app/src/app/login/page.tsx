"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Modo = "login" | "register" | "reset" | "new-password";

// ─── Componente interno (necesita Suspense por useSearchParams) ───────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modo, setModo] = useState<Modo>("login");

  // Detectar ?modo=new-password al montar (viene del link de reset de contraseña)
  useEffect(() => {
    if (searchParams.get("modo") === "new-password") {
      setModo("new-password");
    }
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const supabase = getSupabaseBrowser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/chat");
        router.refresh();

      } else if (modo === "register") {
        if (!nombre.trim()) {
          setMensaje({ tipo: "error", texto: "Ingresa tu nombre o estudio." });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre: nombre.trim() },
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) throw error;
        setMensaje({
          tipo: "ok",
          texto: "Revisa tu correo para confirmar tu cuenta. Puedes cerrar esta ventana.",
        });

      } else if (modo === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/login?modo=new-password`,
        });
        if (error) throw error;
        setMensaje({
          tipo: "ok",
          texto: "Te enviamos un link para restablecer tu contraseña.",
        });

      } else if (modo === "new-password") {
        if (password.length < 6) {
          setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMensaje({ tipo: "ok", texto: "Contraseña actualizada. Redirigiendo…" });
        setTimeout(() => router.push("/chat"), 1500);
      }
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "Error desconocido";
      // Traducir mensajes comunes de Supabase
      const traducido =
        msg.includes("Invalid login credentials")  ? "Email o contraseña incorrectos." :
        msg.includes("User already registered")     ? "Este email ya está registrado. Inicia sesión." :
        msg.includes("Password should be")          ? "La contraseña debe tener al menos 6 caracteres." :
        msg.includes("Email not confirmed")         ? "Confirma tu email antes de ingresar." :
        msg;
      setMensaje({ tipo: "error", texto: traducido });
    } finally {
      setCargando(false);
    }
  }

  const titulos: Record<Modo, string> = {
    login:         "Ingresar",
    register:      "Crear cuenta",
    reset:         "Restablecer contraseña",
    "new-password": "Nueva contraseña",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span
              style={{
                fontFamily: "var(--font-instrument-serif)",
                fontSize: 20,
                color: "var(--ink)",
                letterSpacing: "0.01em",
              }}
            >
              REVISOR ARQ
            </span>
          </Link>
          <p className="mt-2 text-xs" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
            normativa · ciudad · derecho
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            boxShadow: "0 4px 24px rgba(0,0,0,.04)",
          }}
        >
          <h1
            className="mb-5 text-xl font-medium"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            {titulos[modo]}
          </h1>

          {/* Mensaje OK / Error */}
          {mensaje && (
            <div
              className="mb-4 rounded-lg px-3.5 py-2.5 text-sm"
              style={{
                background: mensaje.tipo === "ok"
                  ? "rgba(44,110,73,0.06)"
                  : "rgba(163,63,39,0.06)",
                border: `1px solid ${mensaje.tipo === "ok"
                  ? "rgba(44,110,73,0.18)"
                  : "rgba(163,63,39,0.18)"}`,
                color: mensaje.tipo === "ok" ? "var(--ra-green)" : "var(--terracotta)",
              }}
            >
              {mensaje.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre (solo registro) */}
            {modo === "register" && (
              <div>
                <label className="block mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
                  Nombre o estudio
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Arq. Juan Pérez / Estudio XYZ"
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--rule-2)",
                    color: "var(--ink)",
                  }}
                  disabled={cargando}
                />
              </div>
            )}

            {/* Email (solo login, register, reset) */}
            {modo !== "new-password" && (
            <div>
              <label className="block mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--rule-2)",
                  color: "var(--ink)",
                }}
                disabled={cargando}
              />
            </div>
            )}

            {/* Password (no en reset, sí en new-password) */}
            {(modo !== "reset") && (
              <div>
                <label className="block mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={mostrarPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modo === "login" ? "••••••••" : "Mínimo 6 caracteres"}
                    required
                    minLength={6}
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none transition-colors"
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--rule-2)",
                      color: "var(--ink)",
                    }}
                    disabled={cargando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
                    tabIndex={-1}
                  >
                    {mostrarPass
                      ? <EyeOff className="size-4" style={{ color: "var(--ink)" }} />
                      : <Eye    className="size-4" style={{ color: "var(--ink)" }} />
                    }
                  </button>
                </div>

                {/* Link olvido contraseña */}
                {modo === "login" && (
                  <button
                    type="button"
                    onClick={() => { setModo("reset"); setMensaje(null); }}
                    className="mt-1.5 text-[11px] hover:opacity-70 transition-opacity"
                    style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              {cargando && <Loader2 className="size-3.5 animate-spin" />}
              {modo === "login"         && (cargando ? "Ingresando…"    : "Ingresar")}
              {modo === "register"      && (cargando ? "Creando…"       : "Crear cuenta")}
              {modo === "reset"         && (cargando ? "Enviando…"      : "Enviar link")}
              {modo === "new-password"  && (cargando ? "Guardando…"     : "Guardar contraseña")}
            </button>
          </form>

          {/* Toggle login/register */}
          <div className="mt-5 text-center">
            {modo === "login" ? (
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() => { setModo("register"); setMensaje(null); }}
                  className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Crear cuenta
                </button>
              </p>
            ) : (
              <button
                onClick={() => { setModo("login"); setMensaje(null); }}
                className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--ink-4)" }}
              >
                ← Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px]" style={{ color: "var(--ink-5)", fontFamily: "var(--font-jetbrains-mono)" }}>
          Acceso gratuito — sin tarjeta de crédito
        </p>
      </div>
    </div>
  );
}

// ─── Page export con Suspense (requerido por useSearchParams) ─────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
