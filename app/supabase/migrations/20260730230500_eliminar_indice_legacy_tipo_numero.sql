-- Índice heredado de una versión anterior del esquema. Duplicaba la antigua
-- unicidad tipo+número e impedía la convivencia de decretos sectoriales.
drop index if exists public.normas_tipo_numero_unique;
