"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "ra-cookie-consent";

/**
 * Banner de cookies — aparece en la primera visita.
 * Persiste la decisión en localStorage.
 * Acepta o rechaza cookies de analítica (las esenciales siempre activas).
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // SSR o localStorage bloqueado — no mostrar
    }
  }, []);

  function aceptar() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* noop */ }
    setVisible(false);
  }

  function rechazar() {
    try { localStorage.setItem(STORAGE_KEY, "rejected"); } catch { /* noop */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl px-5 py-4 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Botón cerrar */}
      <button
        onClick={rechazar}
        aria-label="Cerrar aviso de cookies"
        className="absolute right-3 top-3 opacity-40 hover:opacity-70 transition-opacity"
      >
        <X className="size-3.5" style={{ color: "var(--ink)" }} />
      </button>

      <p className="text-[12px] leading-relaxed pr-4" style={{ color: "var(--ink-2)" }}>
        Usamos cookies esenciales para el funcionamiento de la plataforma y cookies de analítica
        para mejorar la experiencia.{" "}
        <Link
          href="/privacidad"
          className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ color: "var(--ink-3)" }}
        >
          Política de privacidad
        </Link>
        .
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={aceptar}
          className="flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          Aceptar
        </button>
        <button
          onClick={rechazar}
          className="flex-1 rounded-lg py-1.5 text-[12px] transition-colors hover:bg-foreground/[0.05]"
          style={{ color: "var(--ink-3)", border: "1px solid var(--rule-2)" }}
        >
          Solo esenciales
        </button>
      </div>
    </div>
  );
}
