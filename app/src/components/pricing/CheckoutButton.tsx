"use client";

import { useState } from "react";

interface Props {
  priceId: string;
  label?: string;
}

export function CheckoutButton({ priceId, label = "Suscribirse →" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Error al iniciar el pago.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.05em",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Redirigiendo…" : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}
    </div>
  );
}
