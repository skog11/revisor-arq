-- ============================================================
-- REVISOR ARQ — RPC count_chunks_por_norma
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Optimiza /api/corpus/status evitando traer miles de filas
-- ============================================================

CREATE OR REPLACE FUNCTION count_chunks_por_norma()
RETURNS TABLE (norma_id uuid, total bigint)
LANGUAGE sql STABLE
AS $$
  SELECT norma_id, COUNT(*) AS total
  FROM chunks
  GROUP BY norma_id;
$$;

-- Permisos: lectura pública para que el service role lo pueda llamar
GRANT EXECUTE ON FUNCTION count_chunks_por_norma() TO service_role;
GRANT EXECUTE ON FUNCTION count_chunks_por_norma() TO anon;
