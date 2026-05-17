/**
 * POST /api/stripe/portal
 * Crea una sesión del Customer Portal de Stripe para que el usuario
 * gestione su suscripción (cancelar, cambiar tarjeta, ver facturas).
 * Requiere usuario autenticado.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  const sb = getSupabaseServiceClient();
  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "No tienes una suscripción activa." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revisor-arq.vercel.app";
  const stripe = getStripe();

  const body = await req.json().catch(() => ({}));
  const returnUrl = (body as { returnUrl?: string }).returnUrl ?? `${appUrl}/pricing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
