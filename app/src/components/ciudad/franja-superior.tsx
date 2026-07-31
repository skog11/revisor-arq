"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";

/**
 * Franja superior de la landing: el lomo del atlas.
 *
 * Aca vive lo que no es parte del sistema normativo y por lo tanto no
 * merece ser un edificio de la maqueta: planes, contacto, ingresar, y el
 * control de dia/noche.
 *
 * El control de dia/noche no es solo decorativo: cambia el tema real del
 * sitio, asi que el chat y las guias tambien quedan oscuros.
 */

const ENLACES = [
  { href: "/pricing", label: "Planes" },
  { href: "/contacto", label: "Contacto" },
];

export function FranjaSuperior() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  const [desplazado, setDesplazado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const onScroll = () => setDesplazado(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const noche = montado && resolvedTheme === "dark";

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: desplazado
          ? noche
            ? "rgba(16,20,26,0.86)"
            : "rgba(246,241,231,0.86)"
          : noche
            ? "linear-gradient(to bottom, rgba(16,20,26,0.78), rgba(16,20,26,0.08))"
            : "linear-gradient(to bottom, rgba(246,241,231,0.82), rgba(246,241,231,0.10))",
        backdropFilter: desplazado ? "blur(10px)" : "blur(2px)",
        borderBottom: desplazado ? "1px solid var(--rule)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-baseline gap-2 focus-visible:outline-none focus-visible:ring-2"
          aria-label="REVISOR ARQ, inicio"
        >
          <span
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: 20,
              letterSpacing: "-0.3px",
              color: "var(--ink)",
            }}
          >
            REVISOR
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              letterSpacing: "2px",
              color: "var(--terracotta)",
            }}
          >
            ARQ
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="hidden rounded-[3px] px-3 py-2 text-[13px] transition-colors hover:opacity-70 sm:block"
              style={{ color: "var(--ink-2)" }}
            >
              {e.label}
            </Link>
          ))}

          {/* Dia / noche */}
          <button
            type="button"
            onClick={() => setTheme(noche ? "light" : "dark")}
            className="ml-1 grid size-9 place-items-center rounded-full transition-colors hover:bg-[var(--paper-2)] focus-visible:outline-none focus-visible:ring-2"
            aria-label={noche ? "Pasar la ciudad al día" : "Pasar la ciudad a la noche"}
            title={noche ? "Amanecer" : "Anochecer"}
          >
            {montado && noche ? (
              /* luna de papel */
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z"
                  fill="#e8c680"
                  stroke="rgba(45,35,20,0.5)"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              /* sol de papel */
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="4.4"
                  fill="#e8c680"
                  stroke="rgba(45,35,20,0.5)"
                  strokeWidth="1.1"
                />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <line
                    key={a}
                    x1="12"
                    y1="3.4"
                    x2="12"
                    y2="5.6"
                    stroke="rgba(45,35,20,0.5)"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    transform={`rotate(${a} 12 12)`}
                  />
                ))}
              </svg>
            )}
          </button>

          <Link
            href="/login"
            className="rounded-[3px] px-3.5 py-2 text-[13px] transition-colors hover:opacity-70"
            style={{
              color: "var(--ink-2)",
              border: "1px solid var(--rule-2)",
            }}
          >
            Ingresar
          </Link>
        </nav>
      </div>
    </header>
  );
}
