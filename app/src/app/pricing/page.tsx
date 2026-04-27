import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description: "REVISOR ARQ está en beta abierta y es completamente gratuito durante este período.",
};

const FEATURES = [
  "Hasta 20 consultas por hora (plan beta)",
  "Tres modos de respuesta: Arquitecto, Abogado y Profundo",
  "Citas verificables con referencias a artículos",
  "Fuentes enlazadas directamente a la BCN",
  "Feedback por respuesta para mejorar el sistema",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 py-20" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <span
            className="mb-4 inline-block rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-widest"
            style={{
              background: "rgba(201,138,31,0.1)",
              color: "rgb(201,138,31)",
              fontFamily: "var(--font-jetbrains-mono)",
              border: "1px solid rgba(201,138,31,0.2)",
            }}
          >
            Beta abierta
          </span>
          <h1
            className="mt-3 text-4xl font-normal"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            Gratuito durante la beta
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Mientras REVISOR ARQ está en beta pública, el acceso es completamente
            gratuito. Cuando lancemos planes de pago, los usuarios beta tendrán
            condiciones preferentes.
          </p>
        </div>

        {/* Plan card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
          }}
        >
          <div className="mb-6 flex items-end gap-2">
            <span
              className="text-5xl font-normal"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
            >
              $0
            </span>
            <span
              className="mb-2 text-sm"
              style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono)" }}
            >
              / mes durante beta
            </span>
          </div>

          <ul className="mb-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: "var(--ra-green)" }}
                />
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/chat"
            className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.05em",
            }}
          >
            Comenzar ahora →
          </Link>
        </div>

        {/* Note */}
        <p
          className="mt-8 text-center text-xs leading-relaxed"
          style={{
            color: "var(--ink-4)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          ¿Tienes preguntas sobre pricing futuro o quieres reportar un error en
          la normativa?{" "}
          <Link
            href="/contacto"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  );
}
