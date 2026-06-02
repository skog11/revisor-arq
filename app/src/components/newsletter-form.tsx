"use client";

import { useState } from "react";
import { Mail, Check, AlertCircle } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok || res.status === 409) {
        setEnviado(true);
        return;
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Demasiadas solicitudes. Intenta más tarde.");
        return;
      }

      setError("No pudimos procesar tu solicitud. Intenta nuevamente.");
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  if (enviado) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium"
        style={{
          color: "var(--ra-green)",
          background: "var(--ra-green-soft)",
          border: "1px solid color-mix(in srgb, var(--ra-green) 30%, transparent)",
        }}
      >
        <Check className="size-4" />
        ¡Suscrito correctamente a las alertas normativas!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto w-full">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: "var(--ink-4)" }} />
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={cargando}
            className="w-full pl-10 pr-4 py-3 rounded-full border text-sm focus:outline-none transition-colors disabled:opacity-60"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--rule-2)",
              color: "var(--ink)",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={cargando}
          className="px-6 py-3 rounded-full text-sm font-medium transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          {cargando ? "Suscribiendo…" : "Suscribirse"}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-xs max-w-md mx-auto w-full px-1" style={{ color: "var(--ra-red, #e53e3e)" }}>
          <AlertCircle className="size-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
