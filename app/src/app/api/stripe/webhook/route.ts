/**
 * POST /api/stripe/webhook
 * Recibe eventos de Stripe y actualiza la tabla subscriptions en Supabase.
 *
 * Configurar en Stripe Dashboard → Webhooks → Add endpoint:
 *   URL: https://revisor-arq.vercel.app/api/stripe/webhook
 *   Eventos: customer.subscription.created, .updated, .deleted
 *             checkout.session.completed
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type Stripe from "stripe";

// Necesario para leer el body raw sin que Next.js lo parsee
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret no configurado" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma Stripe ausente" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma Stripe inválida" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer as string;
      const subId = session.subscription as string;
      if (!userId) break;

      const subscription = await stripe.subscriptions.retrieve(subId);
      await upsertSubscription(sb, userId, customerId, subscription);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      await upsertSubscription(sb, userId, sub.customer as string, sub);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;
      await sb.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: sub.customer as string,
        stripe_sub_id: sub.id,
        plan_id: "free",
        status: "canceled",
        current_period_end: null,
      }, { onConflict: "user_id" });
      break;
    }

    default:
      // Evento no manejado — ignorar
      break;
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  sb: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
  customerId: string,
  sub: Stripe.Subscription
) {
  const planId = sub.status === "active" ? "pro" : "free";
  // En Stripe API v2025+, current_period_end está en el primer item
  const firstItem = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const periodEndTs = firstItem?.current_period_end;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;

  await sb.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_sub_id: sub.id,
    plan_id: planId,
    status: sub.status,
    current_period_end: periodEnd,
  }, { onConflict: "user_id" });
}
