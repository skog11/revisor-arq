update public.normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=30667',
    titulo = 'Aprueba Ley sobre Bases Generales del Medio Ambiente',
    anio_norma = 1994,
    organo_emisor = 'Ministerio Secretaría General de la Presidencia',
    id_norma_bcn = 30667
where tipo = 'LEY' and numero = '19300';

update public.normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=5473',
    anio_norma = 1960,
    organo_emisor = 'Ministerio de Hacienda',
    id_norma_bcn = 5473
where tipo = 'DFL' and numero = '340';

update public.normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=97993',
    anio_norma = 1997,
    organo_emisor = 'Ministerio de Obras Públicas',
    id_norma_bcn = 97993
where tipo = 'DFL' and numero = '850';

update public.normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=6631',
    anio_norma = 1984,
    organo_emisor = 'Ministerio de Transportes y Telecomunicaciones',
    id_norma_bcn = 6631
where tipo = 'LEY' and numero = '18290';

-- El contenido actualmente asociado corresponde al reglamento de la ley y no
-- a la Ley 21.442. Se bloquea hasta que la ingesta oficial reemplace sus chunks.
update public.normas
set url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1174663',
    titulo = 'Aprueba Nueva Ley de Copropiedad Inmobiliaria',
    anio_norma = 2022,
    organo_emisor = 'Ministerio de Vivienda y Urbanismo',
    id_norma_bcn = 1174663,
    vigente = false
where tipo = 'LEY' and numero = '21442';

-- La ley anterior está derogada por la Ley 21.442; se conserva solo como
-- antecedente histórico para consultas con fecha.
update public.normas
set vigente = false
where tipo = 'LEY' and numero = '19537';
