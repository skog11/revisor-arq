import Link from "next/link";

const LINKS = [
  { href: "/pricing",   label: "Precios" },
  { href: "/terminos",  label: "Términos" },
  { href: "/privacidad",label: "Privacidad" },
  { href: "/contacto",  label: "Contacto" },
];

export function Footer() {
  return (
    <footer
      className="px-8 py-6"
      style={{ borderTop: "1px solid var(--rule)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Disclaimer */}
        <p
          className="max-w-2xl text-xs leading-relaxed"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          Esta herramienta es un asistente informativo. No sustituye la asesoría
          profesional de un arquitecto o abogado. Verifica siempre la vigencia
          de la norma citada.
        </p>

        {/* Links */}
        <nav
          className="flex shrink-0 flex-wrap items-center gap-4 text-xs"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "var(--ink-4)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="transition-colors hover:text-[var(--ink-2)]"
            >
              {label}
            </Link>
          ))}
          <span style={{ color: "var(--ink-5)" }}>
            © {new Date().getFullYear()} Revisor ARQ
          </span>
        </nav>
      </div>
    </footer>
  );
}
