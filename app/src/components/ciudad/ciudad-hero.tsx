"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { EDIFICIOS, HALO } from "./datos-ciudad";
import { RotuloEdificio } from "./rotulo-edificio";
import { VidaUrbana } from "./vida-urbana";

export function CiudadHero() {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const noche = montado && resolvedTheme === "dark";

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", background: noche ? "#0f1418" : "var(--paper)" }}
      aria-label="La ciudad normativa"
    >
      {/*
        Contenedor de proporcion 16:9 escalado para cubrir la pantalla.
        Al mantener la proporcion exacta de la foto, cualquier coordenada
        en porcentaje calza con el edificio que le corresponde.
      */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "max(100vw, calc(100svh * 16 / 9))", aspectRatio: "16 / 9" }}
      >
        <div className="ra-ciudad-entrada absolute inset-0">
          <div className="ra-ciudad-deriva absolute inset-0">
        {/* ── La maqueta ───────────────────────────────────── */}
        <div
          className="absolute inset-0 transition-[filter] duration-700"
          style={{
            filter: noche
              ? "saturate(0.96) contrast(1.04)"
              : "saturate(0.97) contrast(1.025)",
          }}
        >
          <Image
            src={
              noche
                ? "/ciudad/ciudad-hero-v4-noche.png"
                : "/ciudad/ciudad-hero-v4.png"
            }
            alt="Maqueta de papel de una ciudad: en el centro, el edificio dorado del Centro de Inteligencia; a un costado, el Archivo de normas y la Escuela; alrededor, los organismos que regulan el territorio."
            fill
            priority
            quality={96}
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Tinte nocturno */}
        {noche && (
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              background:
                "radial-gradient(120% 90% at 52% 42%, rgba(30,44,60,0.02), rgba(5,10,20,0.2) 76%)",
              mixBlendMode: "multiply",
            }}
          />
        )}

        {/* ── Halo del Centro de Inteligencia ──────────────── */}
        <div
          aria-hidden="true"
          className="ra-halo absolute"
          style={{
            left: `${HALO.x}%`,
            top: `${HALO.y}%`,
            width: `${HALO.radio * 2}%`,
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, rgba(232,198,128,${
              noche ? 0.5 : 0.26
            }) 0%, rgba(232,198,128,0) 62%)`,
            mixBlendMode: noche ? "screen" : "soft-light",
          }}
        />

        {/* ── Vida urbana ──────────────────────────────────── */}
        <VidaUrbana noche={noche} />

        {/* ── Rotulos de los edificios-menu (escritorio) ───── */}
        <div className="pointer-events-none absolute inset-0 hidden md:block">
          <div className="pointer-events-auto contents">
            {EDIFICIOS.map((e, i) => (
              <RotuloEdificio key={e.id} edificio={e} indice={i} />
            ))}
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* ── Velo inferior para que el texto se lea ──────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]"
        style={{
          background: noche
            ? "linear-gradient(to top, rgba(8,12,18,0.92), rgba(8,12,18,0))"
            : "linear-gradient(to top, rgba(246,241,231,0.96) 8%, rgba(246,241,231,0.78) 44%, rgba(246,241,231,0))",
        }}
      />

      {/* ── Titulo ───────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-10 sm:px-8 lg:px-16 lg:pb-14">
        <div className="ra-copy-entrada mx-auto max-w-6xl">
          <p
            className="mb-4 flex items-center gap-2"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: 11,
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "var(--terracotta)",
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full"
              style={{ background: "var(--terracotta)" }}
            />
            LGUC · OGUC · DDU · Dictámenes CGR
          </p>

          <h1
            className="max-w-3xl"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(38px, 5.4vw, 74px)",
              lineHeight: 0.98,
              letterSpacing: "-1.6px",
              color: "var(--ink)",
            }}
          >
            Toda la normativa que gobierna{" "}
            <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>
              un solo terreno
            </em>
          </h1>

          <p
            className="mt-5 max-w-xl text-[15px] leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            Una decisión sobre un predio depende de once organismos distintos que
            nunca fueron escritos para leerse juntos. Acá se leen juntos, y cada
            respuesta cita el artículo textual.
          </p>

          {/* Menú en móvil: los rótulos no caben sobre la maqueta */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3 text-[14px] transition-transform hover:-translate-y-0.5"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                fontFamily: "var(--font-inter)",
              }}
            >
              Consultar la normativa
              <span aria-hidden="true">→</span>
            </Link>

            <span className="contents md:hidden">
              {EDIFICIOS.filter((e) => !e.principal).map((e) => (
                <Link
                  key={e.id}
                  href={e.href}
                  className="inline-flex items-center rounded-[3px] px-4 py-3 text-[14px]"
                  style={{
                    background: "rgba(250,246,237,0.9)",
                    border: "1px solid var(--rule-2)",
                    color: "var(--ink-2)",
                  }}
                >
                  {e.rotulo}
                </Link>
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Señal de scroll ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <span
          className="ra-scroll block h-8 w-px"
          style={{
            background:
              "linear-gradient(to bottom, rgba(45,35,20,0), rgba(45,35,20,0.45))",
          }}
        />
      </div>
    </section>
  );
}
