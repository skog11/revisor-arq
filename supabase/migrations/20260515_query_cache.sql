-- Migration: 20260515_query_cache
-- Caché semántica de respuestas RAG frecuentes.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Docs: app/src/lib/query-cache.ts

-- Requiere pgvector (ya habilitado si chunks funciona)

CREATE TABLE IF NOT EXISTS public.query_cache (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  modo          text         NOT NULL,           -- 'arquitecto' | 'abogado' | 'profundo'
  embedding     vector(1024) NOT NULL,           -- embedding de la query normalizada (Voyage)
  query_texto   text         NOT NULL,           -- texto de la query (para debug/análisis)
  respuesta     text         NOT NULL,           -- respuesta cacheada completa
  fuentes       jsonb        NOT NULL DEFAULT '[]',
  hits          integer      NOT NULL DEFAULT 0, -- veces servida desde caché
  created_at    timestamptz  NOT NULL DEFAULT now(),
  last_hit_at   timestamptz  NOT NULL DEFAULT now()
);

-- Índice HNSW para búsqueda por similitud coseno (mismos parámetros que chunks)
CREATE INDEX IF NOT EXISTS idx_query_cache_embedding
  ON public.query_cache USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_query_cache_modo
  ON public.query_cache(modo);

CREATE INDEX IF NOT EXISTS idx_query_cache_last_hit
  ON public.query_cache(last_hit_at DESC);

-- RLS: solo service_role (backend) puede operar esta tabla
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Función para buscar en caché por similitud semántica
CREATE OR REPLACE FUNCTION public.match_query_cache(
  query_embedding  vector(1024),
  query_modo       text,
  similarity_threshold float DEFAULT 0.97,
  max_age_hours    int   DEFAULT 168        -- TTL 7 días
)
RETURNS TABLE (
  id          uuid,
  respuesta   text,
  fuentes     jsonb,
  hits        integer,
  similarity  float
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    respuesta,
    fuentes,
    hits,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.query_cache
  WHERE
    modo = query_modo
    AND created_at > now() - (max_age_hours || ' hours')::interval
    AND 1 - (embedding <=> query_embedding) >= similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT 1;
$$;

-- Política: solo backend (service_role) puede leer/escribir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'query_cache'
      AND policyname = 'service_role_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY service_role_all ON public.query_cache
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    $p$;
  END IF;
END $$;
