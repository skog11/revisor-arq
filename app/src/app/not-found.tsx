import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div
      className="flex min-h-[calc(100vh-130px)] flex-col items-center justify-center px-6 py-20 text-center"
      style={{ background: "var(--paper)" }}
    >
      <div
        className="mb-4 font-mono text-7xl font-light"
        style={{ color: "var(--terracotta)", fontFamily: "var(--font-jetbrains-mono)" }}
      >
        404
      </div>
      <h1
        className="mb-3 text-2xl"
        style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
      >
        Página no encontrada
      </h1>
      <p className="mb-8 text-sm max-w-sm" style={{ color: "var(--ink-3)" }}>
        La página que buscas no existe o fue movida.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-px"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
          }}
        >
          Ir al inicio
        </Link>
        <Link
          href="/chat"
          className="rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:bg-[var(--paper-2)]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--rule-2)",
          }}
        >
          Ir al chat
        </Link>
      </div>
    </div>
  );
}
