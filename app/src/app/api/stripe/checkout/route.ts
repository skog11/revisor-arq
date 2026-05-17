/**
 * POST /api/stripe/checkout
 * Crea una Stripe Checkout Session para el plan Pro.
 * Requiere usuario autenticado (sesión Supabase).
 *
 * Body: { priceId: string; returnUrl?: string }
 * Response: { url: string } — URL de Stripe Checkout para redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { getStripe, PLANES } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/lib/supabase";

const BodySchema = z.object({
  priceId: z.string().min(1),
  returnUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión para suscribirte." }, { status: 401 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { priceId, returnUrl } = parsed.data;

  // Validar que el priceId corresponde a un plan conocido
  const planValido = Object.values(PLANES).find((p) => p.price_id === priceId);
  if (!planValido) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revisor-arq.vercel.app";
  const stripe = getStripe();
  const sb = getSupabaseServiceClient();

  // Buscar o crear customer de Stripe para este usuario
  let stripeCustomerId: string | undefined;
  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (sub?.stripe_customer_id) {
    stripeCustomerId = sub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl ?? appUrl}/pricing?success=1`,
    cancel_url:  `${returnUrl ?? appUrl}/pricing?canceled=1`,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
