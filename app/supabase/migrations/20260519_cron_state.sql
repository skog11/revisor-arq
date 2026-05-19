-- Tabla para persistir el estado del cron job de verificación de vigencia normativa.
-- Almacena la última fecha de versión conocida por norma, detectada en BCN.
--
-- Usado por: /api/cron/check-vigencia

CREATE TABLE IF NOT EXISTS cron_state (
  job        TEXT        NOT NULL,
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (job, key)
);

-- Solo el service_role puede leer/escribir esta tabla (nunca expuesta al cliente)
ALTER TABLE cron_state ENABLE ROW LEVEL SECURITY;

-- Sin políticas RLS = solo accesible via service_role (correcto para cron jobs)
