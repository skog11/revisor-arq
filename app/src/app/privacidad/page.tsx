export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <div
        className="mb-2 text-xs uppercase tracking-widest"
        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-3)" }}
      >
        Legal
      </div>
      <h1
        className="mb-8"
        style={{
          fontFamily: "var(--font-instrument-serif)",
          fontSize: 40,
          lineHeight: 1.05,
          letterSpacing: "-1px",
          color: "var(--ink)",
        }}
      >
        Política de privacidad
      </h1>
      <div
        className="rounded-xl p-6 text-sm leading-relaxed"
        style={{
          background: "var(--card)",
          border: "1px solid var(--rule)",
          color: "var(--ink-3)",
        }}
      >
        <p>
          Este documento está en preparación. Antes del lanzamiento público se
          incluirán: política de tratamiento de datos personales (Ley
          N°19.628), aviso de cookies, y derechos ARCO del usuario.
        </p>
        <p className="mt-4">
          Consulta el skill{" "}
          <code
            className="rounded px-1.5 py-0.5"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 12,
              background: "var(--paper-2)",
            }}
          >
            mvp-legal-launch
          </code>{" "}
          para el checklist completo de protección de datos.
        </p>
      </div>
    </div>
  );
}
