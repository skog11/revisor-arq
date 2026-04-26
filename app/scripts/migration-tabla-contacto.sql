-- ============================================================
-- REVISOR ARQ — Migración: tabla contacto
-- ============================================================
-- La tabla contacto almacena los mensajes del formulario /contacto.
-- La API /api/contacto intenta insertar en ella; si no existe,
-- falla silenciosamente (el usuario no lo nota, pero los reportes
-- nunca llegan).
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS contacto (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        text NOT NULL CHECK (tipo IN (
                'error-corpus', 'norma-faltante', 'respuesta-incorrecta',
                'sugerencia', 'consulta', 'soporte', 'otro'
              )),
  descripcion text NOT NULL,
  email       text,
  leido       boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacto ENABLE ROW LEVEL SECURITY;

-- Inserción pública (sin auth) — el formulario no requiere login
CREATE POLICY "contacto_anon_insert"
  ON contacto FOR INSERT WITH CHECK (true);

-- Service role puede leer, actualizar y eliminar
CREATE POLICY "contacto_service_all"
  ON contacto FOR ALL TO service_role USING (true);

-- ============================================================
-- Verificación:
-- SELECT * FROM contacto ORDER BY created_at DESC LIMIT 5;
-- ============================================================
