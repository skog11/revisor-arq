export default function ChatPage() {
  return (
    <div
      className="flex min-h-[calc(100vh-130px)] flex-col items-center justify-center gap-4 px-8"
      style={{ color: "var(--ink-3)" }}
    >
      <div
        className="mb-2 inline-flex size-12 items-center justify-center rounded-xl text-lg font-semibold"
        style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
      >
        💬
      </div>
      <h1
        className="text-center"
        style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 28,
          color: "var(--ink)",
          letterSpacing: "-0.5px",
        }}
      >
        Consulta de normativa
      </h1>
      <p
        className="text-center text-sm leading-relaxed"
        style={{ maxWidth: 400, color: "var(--ink-3)" }}
      >
        El chat con RAG llega en el Prompt 6. Por ahora esta ruta existe como
        placeholder para que el header funcione correctamente.
      </p>
      <div
        className="rounded-full px-4 py-1.5 text-xs"
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          background: "var(--ra-warn-soft, rgba(201,138,31,0.12))",
          color: "var(--ra-warn)",
          letterSpacing: "0.4px",
          textTransform: "uppercase",
        }}
      >
        Próximamente — Prompt 6
      </div>
    </div>
  );
}
