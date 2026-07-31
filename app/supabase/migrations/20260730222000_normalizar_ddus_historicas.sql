-- Normaliza identidades DDU históricas mal importadas y reúne anexos que
-- habían sido creados como normas independientes. No elimina chunks.

-- Anexos/archivos auxiliares que pertenecen a circulares ya existentes.
update chunks
set norma_id = (select id from normas where tipo = 'DDU' and numero = '457'),
    texto = regexp_replace(texto, '^\[DDU Circulares([[:space:]–-])', '[DDU 457\1'),
    fuente = (select url_fuente from normas where tipo = 'DDU' and numero = '457'),
    metadatos = jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(metadatos, '{}'::jsonb),
          '{url_fuente}',
          to_jsonb((select url_fuente from normas where tipo = 'DDU' and numero = '457')),
          true
        ),
        '{tipo_norma}',
        '"DDU"'::jsonb,
        true
      ),
      '{numero_norma}',
      '"457"'::jsonb,
      true
    )
where norma_id = (
  select id from normas where tipo = 'DDU' and numero = 'Circulares'
);

update normas
set vigente = false,
    url_fuente = null
where tipo = 'DDU' and numero = 'Circulares';

update chunks
set norma_id = (select id from normas where tipo = 'DDU' and numero = '516'),
    texto = regexp_replace(texto, '^\[DDU DDU_000([[:space:]–-])', '[DDU 516\1'),
    fuente = (select url_fuente from normas where tipo = 'DDU' and numero = '516'),
    metadatos = jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(metadatos, '{}'::jsonb),
          '{url_fuente}',
          to_jsonb((select url_fuente from normas where tipo = 'DDU' and numero = '516')),
          true
        ),
        '{tipo_norma}',
        '"DDU"'::jsonb,
        true
      ),
      '{numero_norma}',
      '"516"'::jsonb,
      true
    )
where norma_id = (
  select id from normas where tipo = 'DDU' and numero = 'DDU_000'
);

update normas
set vigente = false,
    url_fuente = null
where tipo = 'DDU' and numero = 'DDU_000';

-- Corrige variantes C55/C100.
update normas
set numero = substring(numero from 2),
    titulo = 'Circular DDU ' || substring(numero from 2)
where tipo = 'DDU' and numero in ('C55', 'C100');

-- Corrige DDU_001, DDU_010, etc. El caso DDU_000 ya fue tratado como anexo.
update normas
set numero = ((substring(numero from 5))::integer)::text,
    titulo = 'Circular DDU ' || (((substring(numero from 5))::integer)::text)
where tipo = 'DDU'
  and numero ~ '^DDU_[0-9]+$'
  and numero <> 'DDU_000';

-- Actualiza el prefijo textual y los metadatos de todas las circulares activas.
update chunks c
set texto = regexp_replace(
      c.texto,
      '^\[DDU (?:DDU_0*|C)(' || n.numero || ')([[:space:]–-])',
      '[DDU ' || n.numero || '\2'
    ),
    metadatos = jsonb_set(
      jsonb_set(coalesce(c.metadatos, '{}'::jsonb), '{tipo_norma}', '"DDU"'::jsonb, true),
      '{numero_norma}',
      to_jsonb(n.numero),
      true
    )
from normas n
where c.norma_id = n.id
  and n.tipo = 'DDU'
  and n.vigente is true
  and (
    c.metadatos->>'tipo_norma' is distinct from 'DDU'
    or c.metadatos->>'numero_norma' is distinct from n.numero
    or c.texto ~ '^\[DDU (DDU_|C)'
  );
