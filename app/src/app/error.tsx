"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-[calc(100vh-130px)] flex-col items-center justify-center px-6 py-20 text-center"
      style={{ background: "var(--paper)" }}
    >
      <AlertTriangle
        className="mb-4 size-10"
        style={{ color: "var(--terracotta)", opacity: 0.7 }}
      />
      <h1
        className="mb-3 text-2xl"
        style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
      >
        Algo salió mal
      </h1>
      <p className="mb-2 text-sm max-w-sm" style={{ color: "var(--ink-3)" }}>
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>
      {error.digest && (
        <p
          className="mb-6 text-[10px]"
          style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-px"
          style={{ background: "var(--ink)", color: "var(--paper)", border: "none", cursor: "pointer" }}
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:bg-[var(--paper-2)]"
          style={{ color: "var(--ink)", border: "1px solid var(--rule-2)" }}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
