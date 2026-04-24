-- ============================================================
-- REVISOR ARQ — Migración Fase 5: Modelo de datos expandido
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 0. Correcciones estructurales críticas
-- -----------------------------------------------------------

-- 0a. Convertir normas.tipo de ENUM a TEXT para permitir tipos personalizados.
--     Si tu tabla ya usa TEXT, este paso no tiene efecto.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'normas' AND column_name = 'tipo'
      AND udt_name != 'text'
  ) THEN
    EXECUTE 'ALTER TABLE normas ALTER COLUMN tipo TYPE text USING tipo::text';
  END IF;
END $$;

-- 0b. Constraint UNIQUE en (tipo, numero): necesario para que el upsert
--     de /api/corpus/ingestar funcione correctamente con onConflict.
CREATE UNIQUE INDEX IF NOT EXISTS normas_tipo_numero_unique
  ON normas (tipo, numero);

-- 0c. También agregar constraint formal para que Supabase lo reconozca en el upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'normas_tipo_numero_key' AND conrelid = 'normas'::regclass
  ) THEN
    ALTER TABLE normas ADD CONSTRAINT normas_tipo_numero_key UNIQUE USING INDEX normas_tipo_numero_unique;
  END IF;
END $$;


-- 1. Nuevas columnas en tabla normas
-- -----------------------------------------------------------

ALTER TABLE normas
  -- Dominio regulatorio primario
  ADD COLUMN IF NOT EXISTS dominio          text,
  -- Subdominio específico
  ADD COLUMN IF NOT EXISTS subdominio       text,
  -- Órgano que emite/administra la norma
  ADD COLUMN IF NOT EXISTS organo_emisor    text,
  -- Jerarquía normativa
  ADD COLUMN IF NOT EXISTS jerarquia_norm   text
    CHECK (jerarquia_norm IN ('ley', 'reglamento', 'instruccion', 'resolucion', 'norma_tecnica', 'otro')),
  -- Etapas del proyecto donde aplica (array)
  ADD COLUMN IF NOT EXISTS etapas_proyecto  text[] NOT NULL DEFAULT '{}',
  -- Dependencias: claves de normas relacionadas (ej: {"LGUC-1", "OGUC-2014"})
  ADD COLUMN IF NOT EXISTS dependencias     text[] NOT NULL DEFAULT '{}',
  -- Alcance territorial
  ADD COLUMN IF NOT EXISTS alcance          text
    CHECK (alcance IN ('nacional', 'regional', 'comunal', 'sectorial'));

COMMENT ON COLUMN normas.dominio        IS 'Dominio regulatorio: urbanismo, medioambiente, salud, patrimonio, infraestructura, energia, aguas, defensa, otro';
COMMENT ON COLUMN normas.subdominio     IS 'Subdominio específico: edificacion, urbanizacion, subdivision, rasantes, accesibilidad, etc.';
COMMENT ON COLUMN normas.organo_emisor  IS 'Órgano emisor: MINVU, SEREMI MINVU, MMA, CMN, MOP, DGA, MINSAL, etc.';
COMMENT ON COLUMN normas.jerarquia_norm IS 'Jerarquía: ley > reglamento > instruccion > resolucion > norma_tecnica';
COMMENT ON COLUMN normas.etapas_proyecto IS 'Etapas del proyecto donde aplica: diseño, anteproyecto, permiso, obra, recepcion, regularizacion';
COMMENT ON COLUMN normas.dependencias   IS 'Claves de normas relacionadas o que remite (tipo-numero)';
COMMENT ON COLUMN normas.alcance        IS 'Alcance territorial de la norma';


-- 2. Índices para búsquedas por dominio y jerarquía
-- -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS normas_dominio_idx
  ON normas (dominio);

CREATE INDEX IF NOT EXISTS normas_jerarquia_idx
  ON normas (jerarquia_norm);

CREATE INDEX IF NOT EXISTS normas_etapas_idx
  ON normas USING gin (etapas_proyecto);


-- 3. Valores por defecto para normas existentes
-- -----------------------------------------------------------

UPDATE normas
SET
  dominio        = 'urbanismo',
  organo_emisor  = CASE
    WHEN tipo::text = 'LGUC' THEN 'Congreso Nacional / MINVU'
    WHEN tipo::text = 'OGUC' THEN 'MINVU'
    WHEN tipo::text LIKE 'DDU%' THEN 'SEREMI MINVU'
    ELSE 'MINVU'
  END,
  jerarquia_norm = CASE
    WHEN tipo::text = 'LGUC' THEN 'ley'
    WHEN tipo::text = 'OGUC' THEN 'reglamento'
    WHEN tipo::text LIKE 'DDU%' THEN 'instruccion'
    ELSE 'instruccion'
  END,
  alcance = 'nacional'
WHERE dominio IS NULL;


-- 4. Actualizar función RPC match_chunks para retornar nuevos campos
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   vector(1024),
  match_count       int DEFAULT 8,
  filter_tipos      text[] DEFAULT NULL,
  solo_vigentes     boolean DEFAULT true
)
RETURNS TABLE (
  id                    uuid,
  texto                 text,
  metadatos             jsonb,
  fecha_vigencia_desde  date,
  fecha_vigencia_hasta  date,
  fuente                text,
  norma_tipo            text,
  norma_numero          text,
  norma_titulo          text,
  norma_fecha_actualizacion date,
  norma_dominio         text,
  norma_organo_emisor   text,
  norma_jerarquia_norm  text,
  norma_etapas_proyecto text[],
  similarity            float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.texto,
    c.metadatos,
    c.fecha_vigencia_desde,
    c.fecha_vigencia_hasta,
    c.fuente,
    n.tipo::text        AS norma_tipo,
    n.numero            AS norma_numero,
    n.titulo            AS norma_titulo,
    n.fecha_actualizacion AS norma_fecha_actualizacion,
    n.dominio           AS norma_dominio,
    n.organo_emisor     AS norma_organo_emisor,
    n.jerarquia_norm    AS norma_jerarquia_norm,
    n.etapas_proyecto   AS norma_etapas_proyecto,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN normas n ON n.id = c.norma_id
  WHERE
    (filter_tipos IS NULL OR n.tipo::text = ANY(filter_tipos))
    AND (NOT solo_vigentes OR c.fecha_vigencia_hasta IS NULL)
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- 5. Actualizar RPC de status para incluir nuevos campos
-- (No requiere cambio en Supabase — los nuevos campos se retornan
--  automáticamente al hacer SELECT * FROM normas)


-- ============================================================
-- INSTRUCCIONES POST-MIGRACIÓN:
-- 1. Ejecuta este script en Supabase Dashboard > SQL Editor
-- 2. Verifica con:
--    SELECT id, tipo, dominio, jerarquia_norm, organo_emisor FROM normas LIMIT 5;
--    SELECT indexname FROM pg_indexes WHERE tablename = 'normas';
--    -- debe aparecer: normas_tipo_numero_unique
-- 3. Vuelve a la app — el panel de Gestión de normativa mostrará
--    los nuevos campos editables por norma
-- ============================================================
