"use client";

export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
      >
        📡
      </div>
      <div className="max-w-sm">
        <h1
          className="text-xl mb-2"
          style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
        >
          Sin conexión
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
          REVISOR ARQ necesita internet para consultar la normativa. Verifica tu conexión e intenta nuevamente.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
