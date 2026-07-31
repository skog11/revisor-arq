ALTER TABLE public.query_cache
  ADD COLUMN IF NOT EXISTS context_version text NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_query_cache_context
  ON public.query_cache (modo, context_version, last_hit_at DESC);

CREATE OR REPLACE FUNCTION public.match_query_cache(
  query_embedding vector(1024), query_modo text, query_context_version text,
  similarity_threshold double precision DEFAULT 0.97, max_age_hours integer DEFAULT 168
)
RETURNS TABLE (id uuid, respuesta text, fuentes jsonb, hits integer, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT qc.id, qc.respuesta, qc.fuentes, qc.hits, (1 - (qc.embedding <=> $1))::double precision
  FROM public.query_cache qc
  WHERE qc.modo = $2 AND qc.context_version = $3
    AND qc.last_hit_at >= now() - make_interval(hours => $5)
    AND (1 - (qc.embedding <=> $1)) >= $4
  ORDER BY qc.embedding <=> $1 LIMIT 1;
$$;
