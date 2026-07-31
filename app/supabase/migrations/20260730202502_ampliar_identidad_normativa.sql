-- Una norma chilena no queda identificada de forma unívoca solo por tipo y
-- número (ej.: existen decretos 30 de distintos ministerios y años).
alter table public.normas
  add column if not exists anio_norma smallint,
  add column if not exists organo_emisor text,
  add column if not exists id_norma_bcn bigint;

comment on column public.normas.anio_norma is
  'Año oficial usado para desambiguar la norma.';
comment on column public.normas.organo_emisor is
  'Ministerio u órgano que emitió la norma.';
comment on column public.normas.id_norma_bcn is
  'Identificador canónico idNorma de LeyChile/BCN.';

create unique index if not exists normas_id_norma_bcn_unique
  on public.normas (id_norma_bcn)
  where id_norma_bcn is not null;

create index if not exists normas_identidad_sectorial_idx
  on public.normas (tipo, numero, anio_norma, organo_emisor);
