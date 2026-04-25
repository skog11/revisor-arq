-- ============================================================
-- REVISOR ARQ — Limpieza de normas DDU duplicadas
-- ============================================================
-- Ejecutar DESPUÉS de que termine ingestar_ddu_masiva.sh
--
-- El script principal (ingestar_normativa_masiva.sh) procesó
-- todos los PDFs en DDU_Circulares_Division_Desarrollo_Urbano
-- y los agrupó bajo UNA sola norma con tipo='DDU' / numero='Circulares',
-- sobreescribiendo los chunks en cada iteración.
--
-- El script DDU-específico crea entradas individuales correctas
-- (tipo='DDU', numero='1', numero='C55', etc.)
--
-- Este script elimina la entrada incorrecta.
-- Los chunks se eliminan automáticamente por CASCADE.
-- ============================================================

BEGIN;

-- 1. Ver qué se va a eliminar antes de confirmar
SELECT
  n.id,
  n.tipo,
  n.numero,
  n.titulo,
  COUNT(c.id) AS total_chunks
FROM normas n
LEFT JOIN chunks c ON c.norma_id = n.id
WHERE n.tipo = 'DDU'
  AND n.numero = 'Circulares'
GROUP BY n.id, n.tipo, n.numero, n.titulo;

-- 2. Eliminar (descomenta cuando estés listo)
-- DELETE FROM normas WHERE tipo = 'DDU' AND numero = 'Circulares';

COMMIT;

-- ============================================================
-- Verificación post-limpieza:
-- ============================================================
-- SELECT tipo, COUNT(*) as total_normas, SUM(total_chunks) as total_chunks
-- FROM (
--   SELECT n.tipo, COUNT(c.id) as total_chunks
--   FROM normas n LEFT JOIN chunks c ON c.norma_id = n.id
--   WHERE n.tipo = 'DDU'
--   GROUP BY n.id, n.tipo
-- ) t GROUP BY tipo;
-- ============================================================
