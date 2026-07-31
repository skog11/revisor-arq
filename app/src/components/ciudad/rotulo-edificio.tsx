"use client";

import Link from "next/link";
import type { Edificio } from "./datos-ciudad";

/**
 * Rotulo de un edificio-menu.
 *
 * Se dibuja como una chincheta de maqueta: un punto sobre el edificio,
 * un hilo fino que sube, y una tarjeta de papel arriba. Nada de esto
 * esta quemado en la imagen — se puede mover, traducir o cambiar sin
 * volver a generar nada.
 *
 * El envoltorio ocupa el tramo vertical entre la tarjeta y el edificio,
 * de modo que el hilo pueda medirse en porcentaje de la altura del hero.
 */

export function RotuloEdificio({
  edificio,
  indice,
}: {
  edificio: Edificio;
  indice: number;
}) {
  const { x, y, hilo, desvio = 0, rotulo, glosa, href, principal } = edificio;

  return (
    <div
      className="ra-rotulo absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y - hilo}%`,
        height: `${hilo}%`,
        animationDelay: `${1.75 + indice * 0.22}s`,
      }}
    >
      {/* hilo */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-px origin-top"
        style={{
          background:
            "linear-gradient(to bottom, rgba(45,35,20,0.05), rgba(45,35,20,0.38))",
        }}
      />

      {/* punto sobre el edificio */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 block size-[7px] -translate-x-1/2 translate-y-1/2 rounded-full"
        style={{
          background: principal ? "var(--ra-oro, #c8a24a)" : "var(--paper, #f6f1e7)",
          border: "1px solid rgba(45,35,20,0.45)",
          boxShadow: "0 1px 3px rgba(40,30,15,0.35)",
        }}
      />

      {/* tarjeta */}
      <Link
        href={href}
        className="group absolute bottom-full left-0 mb-2 block rounded-[3px] px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          transform: `translateX(calc(-50% + ${desvio}rem))`,
          background: "rgba(250,246,237,0.94)",
          border: "1px solid rgba(45,35,20,0.18)",
          boxShadow: "0 6px 18px rgba(40,30,15,0.18), 0 1px 0 rgba(255,255,255,0.7) inset",
          backdropFilter: "blur(2px)",
        }}
      >
        <span
          className="block whitespace-nowrap text-[10px] uppercase leading-none tracking-[0.14em]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: principal ? "#8a6a1e" : "var(--ink-4, #9b9184)",
          }}
        >
          {glosa}
        </span>
        <span
          className="mt-1 block whitespace-nowrap text-[17px] leading-none transition-colors"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            color: "var(--ink, #19160f)",
          }}
        >
          {rotulo}
          <span
            aria-hidden="true"
            className="ml-1.5 inline-block translate-x-0 transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: "var(--terracotta, #b84530)" }}
          >
            →
          </span>
        </span>
      </Link>
    </div>
  );
}
