-- ============================================================
-- REVISOR ARQ — Diagnóstico de base de datos
-- ============================================================
-- Ejecutar en Supabase Dashboard > SQL Editor para verificar
-- el estado de la base de datos antes del primer deploy.
-- ============================================================

-- 1. Versión de pgvector
SELECT extversion AS version_pgvector
FROM pg_extension WHERE extname = 'vector';

-- 2. Conteo general
SELECT
  (SELECT COUNT(*) FROM normas)                        AS total_normas,
  (SELECT COUNT(*) FROM normas WHERE vigente = true)   AS normas_vigentes,
  (SELECT COUNT(*) FROM chunks)                        AS total_chunks,
  (SELECT COUNT(*) FROM chunks WHERE embedding IS NULL) AS chunks_sin_embedding,
  (SELECT COUNT(*) FROM consultas)                     AS total_consultas;

-- 3. Normas por tipo
SELECT tipo, COUNT(*) as total, SUM(CASE WHEN vigente THEN 1 ELSE 0 END) AS vigentes
FROM normas
GROUP BY tipo ORDER BY tipo;

-- 4. Chunks por tipo de norma
SELECT n.tipo, COUNT(c.id) as chunks
FROM chunks c JOIN normas n ON n.id = c.norma_id
GROUP BY n.tipo ORDER BY chunks DESC;

-- 5. Verificar índice HNSW
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'chunks' AND indexname = 'chunks_embedding_idx';

-- 6. Verificar la firma actual de match_chunks
SELECT proname, pg_get_function_result(oid) AS returns
FROM pg_proc WHERE proname = 'match_chunks';

-- 7. ¿Existe la tabla contacto?
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'contacto'
) AS tabla_contacto_existe;

-- 8. Normas sin chunks (potencialmente mal ingestadas)
SELECT n.tipo, n.numero, n.titulo
FROM normas n
LEFT JOIN chunks c ON c.norma_id = n.id
WHERE c.id IS NULL
ORDER BY n.tipo, n.numero;

-- 9. Normas con demasiados pocos chunks (puede indicar problema de ingesta)
SELECT n.tipo, n.numero, n.titulo, COUNT(c.id) AS total_chunks
FROM normas n JOIN chunks c ON c.norma_id = n.id
GROUP BY n.id, n.tipo, n.numero, n.titulo
HAVING COUNT(c.id) <= 2
ORDER BY total_chunks, n.tipo;

-- 10. Últimas 5 consultas guardadas
SELECT id, LEFT(pregunta, 80) AS pregunta, modo, latencia_ms, feedback_thumbs, created_at
FROM consultas ORDER BY created_at DESC LIMIT 5;
