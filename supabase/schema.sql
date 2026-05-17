-- ============================================================
-- SCHEMA — REVISOR ARQ
-- Generado: 2026-05-15 · Región: us-east-1
-- Extensiones requeridas: pgvector, pg_trgm, uuid-ossp
-- ============================================================

-- ─── Extensiones ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Tabla: normas ────────────────────────────────────────────────────────────
-- Catálogo maestro de cuerpos normativos (una fila por ley/reglamento/circular).

CREATE TABLE IF NOT EXISTS public.normas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                text        NOT NULL,         -- 'LGUC','OGUC','DDU','Ley','DFL','DL','DS','DDU_ESPECIFICA','LEY'
  numero              text,                         -- ej: '458', '541', '47'
  titulo              text,
  fecha_publicacion   date,
  fecha_actualizacion date,
  url_fuente          text,
  hash_contenido      text,                         -- SHA-256 del texto fuente (para detectar cambios)
  texto_completo      text,                         -- Texto sin parsear (opcional, para búsquedas adicionales)
  vigente             boolean     NOT NULL DEFAULT true,
  dominio             text,                         -- 'urbanismo','edificacion','patrimonio', etc.
  subdominio          text,
  organo_emisor       text,                         -- 'SEREMI MINVU','BCN','MOP', etc.
  jerarquia_norm      text,                         -- 'ley','reglamento','instruccion','resolucion','norma_tecnica','otro'
  etapas_proyecto     text[]      NOT NULL DEFAULT '{}',  -- ['anteproyecto','permiso','recepcion']
  dependencias        text[]      NOT NULL DEFAULT '{}',  -- norma_ids de los que depende
  alcance             text,                         -- 'nacional','regional','comunal'
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_normas_tipo       ON public.normas(tipo);
CREATE INDEX IF NOT EXISTS idx_normas_vigente    ON public.normas(vigente);
CREATE INDEX IF NOT EXISTS idx_normas_dominio    ON public.normas(dominio);
CREATE INDEX IF NOT EXISTS idx_normas_jerarquia  ON public.normas(jerarquia_norm);

ALTER TABLE public.normas ENABLE ROW LEVEL SECURITY;
-- Lectura pública (anon puede leer normas)
CREATE POLICY "normas_select_anon" ON public.normas FOR SELECT USING (true);
-- Solo service_role puede insertar/modificar
CREATE POLICY "normas_insert_service" ON public.normas FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "normas_update_service" ON public.normas FOR UPDATE USING (auth.role() = 'service_role');

-- ─── Tabla: chunks ────────────────────────────────────────────────────────────
-- Fragmentos semánticos de cada norma con su embedding vectorial.

CREATE TABLE IF NOT EXISTS public.chunks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_id             uuid        NOT NULL REFERENCES public.normas(id) ON DELETE CASCADE,
  articulo_id          text,                    -- ej: '116', '2.7.1', 'bloque-1'
  texto                text        NOT NULL,
  embedding            vector(1024),            -- Voyage AI voyage-law-2 (1024 dims, cosine)
  tokens               integer,
  orden                integer     NOT NULL DEFAULT 0,
  metadatos            jsonb       NOT NULL DEFAULT '{}',
  -- Campos desnormalizados desde metadatos para búsquedas rápidas:
  -- metadatos.articulo, metadatos.jerarquia, metadatos.tipo_norma,
  -- metadatos.url_fuente, metadatos.numero_norma, metadatos.titulo_articulo
  fecha_vigencia_desde date,
  fecha_vigencia_hasta date,
  fuente               text,                    -- URL de la fuente del chunk
  texto_tsv            tsvector    GENERATED ALWAYS AS (to_tsvector('spanish', texto)) STORED
);

-- Índice HNSW para búsqueda vectorial aproximada (cosine distance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON public.chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice GIN para búsqueda full-text (BM25 via ts_rank)
CREATE INDEX IF NOT EXISTS idx_chunks_texto_tsv
  ON public.chunks USING gin (texto_tsv);

-- Índice para filtrar por norma
CREATE INDEX IF NOT EXISTS idx_chunks_norma_id
  ON public.chunks(norma_id);

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks_select_anon"   ON public.chunks FOR SELECT USING (true);
CREATE POLICY "chunks_insert_service" ON public.chunks FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "chunks_delete_service" ON public.chunks FOR DELETE USING (auth.role() = 'service_role');

-- ─── Tabla: consultas ─────────────────────────────────────────────────────────
-- Historial de consultas al chat RAG (para analytics y feedback).

CREATE TABLE IF NOT EXISTS public.consultas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta        text        NOT NULL,
  modo            text        NOT NULL DEFAULT 'arquitecto',  -- 'arquitecto','abogado','profundo'
  respuesta       text,
  chunks_usados   jsonb,       -- Array de {id, norma, articulo, similarity}
  modelo          text,        -- 'gemini-2.5-flash','gemini-2.5-pro','deepseek-chat','llama-3.3-70b', etc.
  tokens_usados   integer,
  latencia_ms     integer,
  feedback_thumbs boolean,     -- NULL=sin feedback, true=👍, false=👎
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultas_user_id    ON public.consultas(user_id);
CREATE INDEX IF NOT EXISTS idx_consultas_created_at ON public.consultas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_modo       ON public.consultas(modo);

ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
-- Usuarios ven solo sus propias consultas; anon ve las suyas (por IP — no implementado aún)
CREATE POLICY "consultas_select_own"   ON public.consultas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consultas_insert_anon"  ON public.consultas FOR INSERT WITH CHECK (true);
CREATE POLICY "consultas_update_service" ON public.consultas FOR UPDATE USING (auth.role() = 'service_role');

-- ─── Tabla: rate_limits ───────────────────────────────────────────────────────
-- Control de tasa por IP persistente (20 consultas/hora).
-- Evita el problema de memory-only en entornos serverless (Vercel).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip          text        PRIMARY KEY,
  timestamps  bigint[]    NOT NULL DEFAULT '{}',  -- epoch ms de cada consulta en la ventana actual
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- No requiere RLS — solo service_role accede (desde el backend)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ─── Tabla: norm_relations ────────────────────────────────────────────────────
-- Grafo de relaciones entre normas (remite, modifica, deroga, complementa).

CREATE TABLE IF NOT EXISTS public.norm_relations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_origen        uuid        NOT NULL REFERENCES public.normas(id) ON DELETE CASCADE,
  norma_destino       uuid        NOT NULL REFERENCES public.normas(id) ON DELETE CASCADE,
  tipo_relacion       text        NOT NULL DEFAULT 'remite_a'
                      CHECK (tipo_relacion IN ('remite_a','modifica','deroga','complementa','reglamenta')),
  articulos_afectados text[]      NOT NULL DEFAULT '{}',
  descripcion         text,
  verificado          boolean     NOT NULL DEFAULT false,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (norma_origen, norma_destino, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS idx_norm_relations_origen  ON public.norm_relations(norma_origen);
CREATE INDEX IF NOT EXISTS idx_norm_relations_destino ON public.norm_relations(norma_destino);

ALTER TABLE public.norm_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "norm_relations_select_anon"    ON public.norm_relations FOR SELECT USING (true);
CREATE POLICY "norm_relations_insert_service" ON public.norm_relations FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ─── RPC: match_chunks ────────────────────────────────────────────────────────
-- Búsqueda vectorial cosine con filtros opcionales.
-- Llamada desde retriever.ts para las capas 1 y 2.

CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding  vector(1024),
  match_count      int     DEFAULT 10,
  filter_tipos     text[]  DEFAULT NULL,
  solo_vigentes    boolean DEFAULT false
)
RETURNS TABLE (
  id                   uuid,
  norma_id             uuid,
  texto                text,
  similarity           float,
  norma_tipo           text,
  norma_numero         text,
  norma_titulo         text,
  norma_dominio        text,
  norma_organo_emisor  text,
  norma_jerarquia_norm text,
  norma_etapas_proyecto text[],
  metadatos            jsonb,
  fecha_vigencia_desde date,
  fuente               text
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.norma_id,
    c.texto,
    1 - (c.embedding <=> query_embedding) AS similarity,
    n.tipo,
    n.numero,
    n.titulo,
    n.dominio,
    n.organo_emisor,
    n.jerarquia_norm,
    n.etapas_proyecto,
    c.metadatos,
    c.fecha_vigencia_desde,
    c.fuente
  FROM public.chunks c
  JOIN public.normas n ON n.id = c.norma_id
  WHERE
    c.embedding IS NOT NULL
    AND (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
    AND (NOT solo_vigentes OR n.vigente = true)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── RPC: match_chunks_hybrid ─────────────────────────────────────────────────
-- Búsqueda híbrida: combinación ponderada de vector cosine + BM25 (FTS).
-- Se activa cuando la query contiene referencias exactas a artículos/normas.

CREATE OR REPLACE FUNCTION public.match_chunks_hybrid(
  query_embedding  vector(1024),
  query_text       text,
  match_count      int     DEFAULT 10,
  filter_tipos     text[]  DEFAULT NULL,
  solo_vigentes    boolean DEFAULT false,
  vector_weight    float   DEFAULT 0.7   -- peso del score vectorial (1-vector_weight = peso FTS)
)
RETURNS TABLE (
  id                   uuid,
  norma_id             uuid,
  texto                text,
  similarity           float,
  norma_tipo           text,
  norma_numero         text,
  norma_titulo         text,
  norma_dominio        text,
  norma_organo_emisor  text,
  norma_jerarquia_norm text,
  norma_etapas_proyecto text[],
  metadatos            jsonb,
  fecha_vigencia_desde date,
  fuente               text
)
LANGUAGE sql STABLE AS $$
  WITH vector_scores AS (
    SELECT
      c.id,
      1 - (c.embedding <=> query_embedding) AS vscore
    FROM public.chunks c
    JOIN public.normas n ON n.id = c.norma_id
    WHERE
      c.embedding IS NOT NULL
      AND (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
      AND (NOT solo_vigentes OR n.vigente = true)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  fts_scores AS (
    SELECT
      c.id,
      ts_rank(c.texto_tsv, websearch_to_tsquery('spanish', query_text)) AS fscore
    FROM public.chunks c
    JOIN public.normas n ON n.id = c.norma_id
    WHERE
      c.texto_tsv @@ websearch_to_tsquery('spanish', query_text)
      AND (filter_tipos IS NULL OR n.tipo = ANY(filter_tipos))
      AND (NOT solo_vigentes OR n.vigente = true)
    LIMIT match_count * 3
  )
  SELECT
    c.id,
    c.norma_id,
    c.texto,
    (COALESCE(vs.vscore, 0) * vector_weight
      + COALESCE(fs.fscore, 0) * (1 - vector_weight)) AS similarity,
    n.tipo,
    n.numero,
    n.titulo,
    n.dominio,
    n.organo_emisor,
    n.jerarquia_norm,
    n.etapas_proyecto,
    c.metadatos,
    c.fecha_vigencia_desde,
    c.fuente
  FROM public.chunks c
  JOIN public.normas n ON n.id = c.norma_id
  LEFT JOIN vector_scores vs ON vs.id = c.id
  LEFT JOIN fts_scores    fs ON fs.id = c.id
  WHERE vs.id IS NOT NULL OR fs.id IS NOT NULL
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ─── RPC: check_and_use_quota ─────────────────────────────────────────────────
-- Verifica y consume la cuota mensual de consultas de un usuario.
-- Retorna true si la consulta está permitida, false si la cuota se agotó.

CREATE OR REPLACE FUNCTION public.check_and_use_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used    int;
  v_limit   int := 50;  -- cuota mensual por defecto (ajustar según plan)
BEGIN
  -- Contar consultas del mes actual
  SELECT COUNT(*) INTO v_used
  FROM public.consultas
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now());

  RETURN v_used < v_limit;
END;
$$;

-- ─── Notas de operación ───────────────────────────────────────────────────────
--
-- RECREAR DESDE CERO:
--   1. Habilitar extensiones (pgvector, pg_trgm, uuid-ossp) en Supabase Dashboard
--   2. Ejecutar este archivo completo en el SQL Editor
--   3. Configurar variables de entorno (ver app/.env.local.example)
--   4. Correr la ingesta: cd app && npm run corpus:ingest
--
-- ESTADO 2026-05-15:
--   normas:  358 filas  (269 DDU + LGUC + OGUC + 80 Ley/DS/DFL/DL/etc.)
--   chunks:  12.483 filas
--   embedding: voyage-law-2 (1024 dims, cosine)
--
-- ÍNDICE HNSW:
--   m=16, ef_construction=64 — balance calidad/velocidad para <100k vectores.
--   Para >500k chunks considerar aumentar ef_construction a 128.
