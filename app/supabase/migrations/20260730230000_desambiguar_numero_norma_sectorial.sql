-- El número de un decreto no es único a nivel nacional. La identificación
-- jurídica pasa a ser tipo + número + año + órgano emisor (o idNorma BCN).
alter table public.normas
  drop constraint if exists normas_tipo_numero_key;

create unique index if not exists normas_identidad_sectorial_unique
  on public.normas (
    tipo,
    numero,
    coalesce(anio_norma, -1),
    coalesce(organo_emisor, '')
  );
