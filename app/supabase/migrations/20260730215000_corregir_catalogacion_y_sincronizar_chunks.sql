-- Corrige identidades mal catalogadas y sincroniza la fuente efectiva usada
-- por recuperación/citación. No incorpora documentos ni elimina contenido.

-- El registro rotulado DS 660 contiene en realidad el DS 9 de 2018.
update normas
set numero = '9',
    titulo = 'Sustituye Reglamento sobre Concesiones Marítimas',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1116315',
    anio_norma = 2018,
    organo_emisor = 'Ministerio de Defensa Nacional',
    id_norma_bcn = 1116315,
    vigente = true
where tipo = 'DS' and numero = '660';

update chunks
set texto = regexp_replace(texto, '^\[DS 660([[:space:]–-])', '[DS 9\1')
where norma_id = (select id from normas where tipo = 'DS' and numero = '9');

-- El registro rotulado DS 93 contiene el decreto modificatorio DS 26.
update normas
set numero = '26',
    titulo = 'Aprueba modificación del Reglamento General de la Ley sobre Recuperación del Bosque Nativo y Fomento Forestal',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1037805',
    anio_norma = 2011,
    organo_emisor = 'Ministerio de Agricultura',
    id_norma_bcn = 1037805,
    vigente = true
where tipo = 'DS' and numero = '93';

update chunks
set texto = regexp_replace(texto, '^\[DS 93([[:space:]–-])', '[DS 26\1')
where norma_id = (select id from normas where tipo = 'DS' and numero = '26');

-- El registro rotulado como ley corresponde a la Resolución Exenta 4.677.
update normas
set tipo = 'RESOLUCION',
    titulo = 'Aprueba normas para aplicación del artículo 41 del DFL MOP N° 850 de 1997',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=138872',
    anio_norma = 1999,
    organo_emisor = 'Ministerio de Obras Públicas · Dirección de Vialidad',
    id_norma_bcn = 138872,
    vigente = true
where tipo = 'LEY' and numero = '4677';

update chunks
set texto = regexp_replace(texto, '^\[LEY 4677([[:space:]–-])', '[RESOLUCION 4677\1')
where norma_id = (
  select id from normas where tipo = 'RESOLUCION' and numero = '4677'
);

-- Corrige identidades BCN y años de normas que tenían enlaces truncados,
-- IDs de otra norma o páginas institucionales genéricas.
update normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=5545',
    anio_norma = 1988,
    organo_emisor = 'Ministerio de Obras Públicas',
    id_norma_bcn = 5545
where tipo = 'DFL' and numero = '382';

update normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=5595',
    anio_norma = 1967,
    organo_emisor = 'Ministerio de Salud Pública',
    id_norma_bcn = 5595
where tipo = 'DFL' and numero = '725';

update normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=6778',
    anio_norma = 1977,
    organo_emisor = 'Ministerio de Tierras y Colonización',
    id_norma_bcn = 6778
where tipo = 'DL' and numero = '1939';

update normas
set titulo = 'Fija normas para regularizar la posesión de la pequeña propiedad raíz y para la constitución del dominio sobre ella',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=6982',
    anio_norma = 1979,
    organo_emisor = 'Ministerio de Tierras y Colonización',
    id_norma_bcn = 6982
where tipo = 'DL' and numero = '2695';

update normas
set titulo = 'Aprueba Reglamento Sanitario sobre Manejo de Residuos Peligrosos',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=226458',
    anio_norma = 2003,
    organo_emisor = 'Ministerio de Salud',
    id_norma_bcn = 226458
where tipo = 'DS' and numero = '148';

update normas
set titulo = 'Promulga el Convenio N° 169 sobre Pueblos Indígenas y Tribales en Países Independientes de la OIT',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=279441',
    anio_norma = 2008,
    organo_emisor = 'Ministerio de Relaciones Exteriores',
    id_norma_bcn = 279441
where tipo = 'DS' and numero = '236';

update normas
set titulo = 'Aprueba Reglamento que regula el procedimiento de consulta indígena',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1059961',
    anio_norma = 2013,
    organo_emisor = 'Ministerio de Desarrollo Social',
    id_norma_bcn = 1059961
where tipo = 'DS' and numero = '66';

update normas
set titulo = 'Legisla sobre Monumentos Nacionales',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=28892',
    anio_norma = 1970,
    organo_emisor = 'Ministerio de Educación Pública',
    id_norma_bcn = 28892
where tipo = 'LEY' and numero = '17288';

update normas
set titulo = 'Establece normas sobre protección, fomento y desarrollo de los indígenas y crea la CONADI',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=30620',
    anio_norma = 1993,
    organo_emisor = 'Ministerio de Planificación y Cooperación',
    id_norma_bcn = 30620
where tipo = 'LEY' and numero = '19253';

update normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=210676',
    anio_norma = 2003,
    organo_emisor = 'Ministerio Secretaría General de la Presidencia',
    id_norma_bcn = 210676
where tipo = 'LEY' and numero = '19880';

update normas
set titulo = 'Ley sobre Recuperación del Bosque Nativo y Fomento Forestal',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=274894',
    anio_norma = 2008,
    organo_emisor = 'Ministerio de Agricultura',
    id_norma_bcn = 274894
where tipo = 'LEY' and numero = '20283';

update normas
set titulo = 'Sobre acceso a la información pública',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=276363',
    anio_norma = 2008,
    organo_emisor = 'Ministerio Secretaría General de la Presidencia',
    id_norma_bcn = 276363
where tipo = 'LEY' and numero = '20285';

update normas
set titulo = 'Crea el Ministerio, el Servicio de Evaluación Ambiental y la Superintendencia del Medio Ambiente',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1010459',
    anio_norma = 2010,
    organo_emisor = 'Ministerio Secretaría General de la Presidencia',
    id_norma_bcn = 1010459
where tipo = 'LEY' and numero = '20417';

update normas
set titulo = 'Crea los Tribunales Ambientales',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1041361',
    anio_norma = 2012,
    organo_emisor = 'Ministerio del Medio Ambiente',
    id_norma_bcn = 1041361
where tipo = 'LEY' and numero = '20600';

update normas
set titulo = 'Reforma el Código de Aguas',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1174443',
    anio_norma = 2022,
    organo_emisor = 'Ministerio de Obras Públicas',
    id_norma_bcn = 1174443
where tipo = 'LEY' and numero = '21435';

-- Sincroniza la fuente y la identidad que realmente consumen los buscadores.
update chunks c
set fuente = n.url_fuente,
    metadatos = jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(c.metadatos, '{}'::jsonb), '{url_fuente}', to_jsonb(n.url_fuente), true),
        '{tipo_norma}', to_jsonb(n.tipo), true
      ),
      '{numero_norma}', to_jsonb(n.numero), true
    )
from normas n
where c.norma_id = n.id
  and n.vigente is true
  and n.url_fuente is not null
  and (
    c.fuente is distinct from n.url_fuente
    or c.metadatos->>'url_fuente' is distinct from n.url_fuente
    or c.metadatos->>'tipo_norma' is distinct from n.tipo
    or c.metadatos->>'numero_norma' is distinct from n.numero
  );
