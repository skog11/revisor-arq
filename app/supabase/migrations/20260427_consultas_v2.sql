-- Columnas adicionales para métricas del pipeline RAG v2
ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS clasificacion           jsonb,
  ADD COLUMN IF NOT EXISTS relaciones_detectadas   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advertencias_validacion text[];
