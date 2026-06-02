CREATE TABLE IF NOT EXISTS newsletter_suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_activas
  ON newsletter_suscripciones(activa) WHERE activa = true;
