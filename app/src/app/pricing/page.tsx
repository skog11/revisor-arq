import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";
import { PLANES } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Precios · REVISOR ARQ",
  description: "Planes de acceso a REVISOR ARQ — normativa urbanística chilena con citas verificables.",
};

const FREE_FEATURES = [
  "50 consultas por mes",
  "Modos Arquitecto y Abogado",
  "Citas verificables con artículos",
  "Fuentes enlazadas a BCN",
  "Feedback por respuesta",
];

const PRO_FEATURES = [
  "500 consultas por mes",
  "Todos los modos (incluye Profundo)",
  "Análisis de cruces normativos",
  "Respuestas con Gemini Pro (mayor precisión)",
  "Soporte por correo",
  "Todo lo del plan gratuito",
];

const stripeConfigurado = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO);

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 py-20" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-3xl">

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
            {stripeConfigurado ? "Planes disponibles" : "Beta abierta"}
          </span>
          <h1
            className="mt-3 text-4xl font-normal"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            {stripeConfigurado ? "Elige tu plan" : "Gratuito durante la beta"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
            {stripeConfigurado
              ? "Accede a normativa urbanística chilena con citas verificables. Cancela cuando quieras."
              : "Mientras REVISOR ARQ está en beta pública, el acceso es completamente gratuito. Los usuarios beta tendrán condiciones preferentes cuando lancemos planes de pago."}
          </p>
        </div>

        {/* Planes */}
        <div className={`grid gap-4 ${stripeConfigurado ? "sm:grid-cols-2" : "max-w-md mx-auto"}`}>

          {/* Plan Gratuito */}
          <div
            className="rounded-2xl p-8"
            style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
          >
            <p
              className="mb-1 text-[10px] uppercase tracking-widest"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--ink-4)" }}
            >
              {PLANES.free.nombre}
            </p>
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
                / mes
              </span>
            </div>

            <ul className="mb-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ra-green)" }} />
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/chat"
              className="block w-full rounded-xl py-3 text-center text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--paper)",
                color: "var(--ink)",
                border: "1px solid var(--rule)",
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.05em",
              }}
            >
              Comenzar gratis →
            </Link>
          </div>

          {/* Plan Pro */}
          {stripeConfigurado && (
            <div
              className="rounded-2xl p-8 relative"
              style={{ background: "var(--ink)", border: "1px solid var(--ink)" }}
            >
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-medium uppercase tracking-widest"
                style={{
                  background: "var(--mode-arq)",
                  color: "#fff",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                Recomendado
              </span>
              <p
                className="mb-1 text-[10px] uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "rgba(255,255,255,0.5)" }}
              >
                {PLANES.pro.nombre}
              </p>
              <div className="mb-6 flex items-end gap-2">
                <span
                  className="text-5xl font-normal"
                  style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--paper)" }}
                >
                  $19
                </span>
                <span
                  className="mb-2 text-sm"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  USD / mes
                </span>
              </div>

              <ul className="mb-8 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ra-green)" }} />
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <CheckoutButton priceId={PLANES.pro.price_id!} label="Suscribirse →" />
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-10 text-center text-xs leading-relaxed"
          style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          ¿Preguntas sobre precios o normativa?{" "}
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
