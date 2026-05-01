-- ============================================================
-- REVISOR ARQ — Migración: búsqueda híbrida full-text + vector
-- ============================================================
--
-- Agrega:
--   1. Índice GIN sobre chunks.texto para full-text search en español
--   2. Función search_chunks_fts: búsqueda por texto literal
--   3. Función match_chunks_hybrid: combina FTS + vector con RRF
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. Agregar columna tsvector (si no existe) ────────────────────────────────

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS texto_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(texto, ''))) STORED;

-- ── 2. Índice GIN para búsqueda full-text ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS chunks_texto_tsv_idx
  ON chunks USING GIN (texto_tsv);

-- ── 3. Función de búsqueda full-text pura ────────────────────────────────────

CREATE OR REPLACE FUNCTION search_chunks_fts(
  query_text        text,
  match_count       int DEFAULT 20,
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
    -- Normalizar rank a [0,1] aproximado
    ts_rank_cd(c.texto_tsv, websearch_to_tsquery('spanish', query_text))::float AS similarity
  FROM chunks c
  JOIN normas n ON n.id = c.norma_id
  WHERE
    c.texto_tsv @@ websearch_to_tsquery('spanish', query_text)
    AND (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
    AND (NOT solo_vigentes OR (n.vigente = true AND c.fecha_vigencia_hasta IS NULL))
  ORDER BY ts_rank_cd(c.texto_tsv, websearch_to_tsquery('spanish', query_text)) DESC
  LIMIT match_count;
$$;

-- ── 4. Función híbrida con Reciprocal Rank Fusion ────────────────────────────
--
-- RRF score = 1 / (k + rank_vector) + 1 / (k + rank_fts)
-- donde k=60 es la constante clásica de RRF (Cormack et al., 2009)
--
-- Parámetros:
--   query_embedding  : vector de la consulta (generado en la app)
--   query_text       : texto literal de la consulta (para FTS)
--   match_count      : número de resultados a devolver
--   filter_tipos     : filtro por tipo de norma (NULL = todos)
--   solo_vigentes    : filtrar normas no vigentes
--   vector_weight    : peso del componente vectorial (0-1, default 0.7)

CREATE OR REPLACE FUNCTION match_chunks_hybrid(
  query_embedding   vector(1024),
  query_text        text,
  match_count       int     DEFAULT 16,
  filter_tipos      text[]  DEFAULT NULL,
  solo_vigentes     boolean DEFAULT true,
  vector_weight     float   DEFAULT 0.7
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
  WITH
  -- Candidatos por similitud vectorial (top 40)
  vec AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS rank_vec,
      1 - (c.embedding <=> query_embedding) AS score_vec
    FROM chunks c
    JOIN normas n ON n.id = c.norma_id
    WHERE
      (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
      AND (NOT solo_vigentes OR (n.vigente = true AND c.fecha_vigencia_hasta IS NULL))
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT 40
  ),
  -- Candidatos por full-text search (top 40)
  fts AS (
    SELECT
      c.id,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.texto_tsv, websearch_to_tsquery('spanish', query_text)) DESC) AS rank_fts
    FROM chunks c
    JOIN normas n ON n.id = c.norma_id
    WHERE
      c.texto_tsv @@ websearch_to_tsquery('spanish', query_text)
      AND (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
      AND (NOT solo_vigentes OR (n.vigente = true AND c.fecha_vigencia_hasta IS NULL))
    ORDER BY ts_rank_cd(c.texto_tsv, websearch_to_tsquery('spanish', query_text)) DESC
    LIMIT 40
  ),
  -- RRF combinado
  rrf AS (
    SELECT
      COALESCE(vec.id, fts.id) AS id,
      (
        COALESCE(vector_weight       * (1.0 / (60 + COALESCE(vec.rank_vec, 100))), 0) +
        COALESCE((1 - vector_weight) * (1.0 / (60 + COALESCE(fts.rank_fts, 100))), 0)
      ) AS rrf_score,
      COALESCE(vec.score_vec, 0)::float AS score_vec
    FROM vec
    FULL OUTER JOIN fts ON vec.id = fts.id
  )
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
    rrf.rrf_score::float       AS similarity
  FROM rrf
  JOIN chunks c ON c.id = rrf.id
  JOIN normas n ON n.id = c.norma_id
  ORDER BY rrf.rrf_score DESC
  LIMIT match_count;
$$;

-- ── 5. Comentarios de uso ─────────────────────────────────────────────────────

COMMENT ON FUNCTION search_chunks_fts IS
  'Búsqueda full-text en español usando websearch_to_tsquery. Útil para artículos exactos.';

COMMENT ON FUNCTION match_chunks_hybrid IS
  'Búsqueda híbrida vector+FTS con Reciprocal Rank Fusion. '
  'Combina similitud semántica (voyage-law-2) con coincidencia léxica (ts_rank_cd). '
  'vector_weight=0.7 favorece la semántica; usar 0.5 para consultas con artículos exactos.';
