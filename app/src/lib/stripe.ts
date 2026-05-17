/**
 * stripe.ts — Cliente Stripe singleton para el backend.
 *
 * IMPORTANTE: importar solo desde Server Components, Route Handlers y API routes.
 * Nunca importar en Client Components (expone STRIPE_SECRET_KEY al bundle del cliente).
 *
 * Variables de entorno requeridas:
 *   STRIPE_SECRET_KEY          — sk_live_... o sk_test_...
 *   STRIPE_WEBHOOK_SECRET      — whsec_... (desde Stripe Dashboard → Webhooks)
 *   NEXT_PUBLIC_STRIPE_PRICE_PRO — price_... Plan Profesional mensual
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

// ─── Planes disponibles ───────────────────────────────────────────────────────

export const PLANES = {
  free: {
    id: "free",
    nombre: "Beta gratuita",
    consultas_mes: 50,
    price_id: null,
  },
  pro: {
    id: "pro",
    nombre: "Profesional",
    consultas_mes: 500,
    price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? null,
  },
} as const;

export type PlanId = keyof typeof PLANES;

export function getPlan(planId: string | null | undefined): typeof PLANES[PlanId] {
  if (planId === "pro") return PLANES.pro;
  return PLANES.free;
}
