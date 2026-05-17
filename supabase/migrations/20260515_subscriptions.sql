-- Migration: 20260515_subscriptions
-- Tabla de suscripciones para integración con Stripe.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id  text        UNIQUE,
  stripe_sub_id       text        UNIQUE,
  plan_id             text        NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  status              text        NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id);

-- RLS: cada usuario solo puede ver su propia suscripción
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role puede leer/escribir todo (para webhooks de Stripe)
CREATE POLICY "subscriptions_service_role"
  ON public.subscriptions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Función check_and_use_quota mejorada: respeta plan del usuario
CREATE OR REPLACE FUNCTION public.check_and_use_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used      int;
  v_plan_id   text := 'free';
  v_limit     int  := 50;
BEGIN
  -- Obtener plan activo del usuario
  SELECT plan_id INTO v_plan_id
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  LIMIT 1;

  -- Cuota según plan
  CASE v_plan_id
    WHEN 'pro'  THEN v_limit := 500;
    ELSE             v_limit := 50;   -- free / beta
  END CASE;

  -- Contar consultas del mes actual
  SELECT COUNT(*) INTO v_used
  FROM public.consultas
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now());

  RETURN v_used < v_limit;
END;
$$;

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
