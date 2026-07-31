-- Sanea únicamente registros ya existentes en el corpus.
-- No incorpora normativa nueva ni elimina chunks: los alias y fuentes dudosas
-- quedan inactivos para conservar trazabilidad histórica.

-- Todas las circulares DDU son emitidas por la División de Desarrollo Urbano.
update normas
set organo_emisor = 'MINVU · División de Desarrollo Urbano'
where tipo in ('DDU', 'DDU_ESPECIFICA')
  and organo_emisor is distinct from 'MINVU · División de Desarrollo Urbano';

-- Circulares cuyo contenido era correcto, pero cuya fuente estaba cruzada.
update normas
set url_fuente = 'https://www.minvu.gob.cl/wp-content/uploads/2019/06/DDU-467-derogada-por-DDU-521.pdf',
    anio_norma = 2022,
    vigente = false
where tipo = 'DDU' and numero = '467';

update normas
set url_fuente = 'https://www.minvu.gob.cl/wp-content/uploads/2019/06/DDU-478.pdf',
    anio_norma = 2023,
    vigente = true
where tipo = 'DDU' and numero = '478';

update normas
set url_fuente = 'https://www.minvu.gob.cl/wp-content/uploads/2019/06/DDU-487-derogada-por-DDU-511.pdf',
    anio_norma = 2023,
    vigente = false
where tipo = 'DDU' and numero = '487';

update normas
set url_fuente = 'https://www.minvu.gob.cl/wp-content/uploads/2019/06/DDU-519.pdf',
    anio_norma = 2025,
    vigente = true
where tipo = 'DDU' and numero = '519';

-- Fuentes sectoriales vigentes: identidad oficial BCN y títulos normalizados.
update normas
set titulo = 'Aprueba modificación al DS N° 40 de 2012, Reglamento del Sistema de Evaluación de Impacto Ambiental',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1200689',
    anio_norma = 2023,
    organo_emisor = 'Ministerio del Medio Ambiente',
    id_norma_bcn = 1200689,
    vigente = true
where tipo = 'DS' and numero = '30';

update normas
set titulo = 'Establece norma de emisión de ruidos generados por fuentes que indica',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1040928',
    anio_norma = 2011,
    organo_emisor = 'Ministerio del Medio Ambiente',
    id_norma_bcn = 1040928,
    vigente = true
where tipo = 'DS' and numero = '38';

update normas
set titulo = 'Aprueba Reglamento del Sistema de Evaluación de Impacto Ambiental',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1053563',
    anio_norma = 2012,
    organo_emisor = 'Ministerio del Medio Ambiente',
    id_norma_bcn = 1053563,
    vigente = true
where tipo = 'DS' and numero = '40';

update normas
set titulo = 'Aprueba el Reglamento de Instalaciones Domiciliarias de Agua Potable y de Alcantarillado',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=207101',
    anio_norma = 2002,
    organo_emisor = 'Ministerio de Obras Públicas',
    id_norma_bcn = 207101,
    vigente = true
where tipo = 'DS' and numero = '50';

update normas
set titulo = 'Aprueba reglamento que fija los requisitos de diseño y cálculo para el hormigón armado',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1034100',
    anio_norma = 2011,
    organo_emisor = 'Ministerio de Vivienda y Urbanismo',
    id_norma_bcn = 1034100,
    vigente = true
where tipo = 'DS' and numero = '60';

update normas
set titulo = 'Aprueba reglamento que fija el diseño sísmico de edificios',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=1034101',
    anio_norma = 2011,
    organo_emisor = 'Ministerio de Vivienda y Urbanismo',
    id_norma_bcn = 1034101,
    vigente = true
where tipo = 'DS' and numero = '61';

update normas
set titulo = 'Aprueba el reglamento para la calificación y evaluación de los accidentes del trabajo y enfermedades profesionales',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=9391',
    anio_norma = 1968,
    organo_emisor = 'Ministerio del Trabajo y Previsión Social',
    id_norma_bcn = 9391,
    vigente = true
where tipo = 'DS' and numero = '109';

update normas
set titulo = 'Aprueba el Reglamento de las Concesiones Sanitarias',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=243794',
    anio_norma = 2004,
    organo_emisor = 'Ministerio de Obras Públicas',
    id_norma_bcn = 243794,
    vigente = true
where tipo = 'DS' and numero = '1199';

update normas
set titulo = 'Aprueba Reglamento General del Decreto Ley N° 701 de 1974 sobre Fomento Forestal',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=125009',
    anio_norma = 1998,
    organo_emisor = 'Ministerio de Agricultura',
    id_norma_bcn = 125009,
    vigente = true
where tipo = 'DS' and numero = '193';

update normas
set titulo = 'Reglamento del Decreto Ley N° 701 de 1974 sobre Fomento Forestal',
    url_fuente = 'https://www.bcn.cl/leychile/navegar?idNorma=11624',
    anio_norma = 1980,
    organo_emisor = 'Ministerio de Agricultura',
    id_norma_bcn = 11624,
    vigente = true
where tipo = 'DS' and numero = '259';

-- Alias duplicados o registros cuyo contenido no corresponde a su título.
-- Se desactivan y se elimina su enlace engañoso, sin borrar el registro.
update normas
set vigente = false,
    url_fuente = null,
    id_norma_bcn = null
where tipo = 'DS'
  and numero in (
    '38-2012',
    '50-2002',
    '60-2011',
    '61-2011',
    '109-1968',
    '1199-2004',
    '193-1998',
    '259-1980'
  );
