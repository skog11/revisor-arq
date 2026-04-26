-- ============================================================
-- REVISOR ARQ — Migración: match_chunks v2
-- ============================================================
-- Correcciones respecto a la versión original:
--
-- 1. BUG FIX: solo_vigentes ahora también filtra n.vigente = true
--    (antes solo filtraba fecha_vigencia_hasta IS NULL, ignorando
--    el toggle del panel de administración)
--
-- 2. FEATURE: retorna los metadatos expandidos de la norma
--    (dominio, organo_emisor, jerarquia_norm, etapas_proyecto)
--    que el cliente RAG espera pero la función no devolvía
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

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
    n.tipo                     AS norma_tipo,
    n.numero                   AS norma_numero,
    n.titulo                   AS norma_titulo,
    n.fecha_actualizacion      AS norma_fecha_actualizacion,
    n.dominio                  AS norma_dominio,
    n.organo_emisor            AS norma_organo_emisor,
    n.jerarquia_norm           AS norma_jerarquia_norm,
    n.etapas_proyecto          AS norma_etapas_proyecto,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN normas n ON n.id = c.norma_id
  WHERE
    (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
    AND (NOT solo_vigentes OR (n.vigente = true AND c.fecha_vigencia_hasta IS NULL))
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- Verificación: las normas con vigente=false no deben aparecer
-- SELECT count(*) FROM match_chunks('[... vector ...]'::vector(1024), 5, NULL, true)
--   WHERE norma_tipo IN (SELECT tipo FROM normas WHERE vigente = false);
-- (debe retornar 0)
-- ============================================================
