-- ═══════════════════════════════════════════════════════════════════
-- Normaliza el campo `dominio` de la tabla normas
--
-- Problema detectado el 2026-07-25: de 420 normas, 134 tenian `dominio`
-- en NULL — entre ellas los 59 dictamenes CGR y 32 circulares DDU — y
-- las que si lo tenian usaban valores fuera del vocabulario canonico
-- ('Accesibilidad', 'Copropiedad', 'energia', 'infraestructura', 'otro').
--
-- El vocabulario canonico es el de DOMINIO_A_NORMAS en src/lib/router.ts:
--   urbanismo · construccion · accesibilidad · copropiedad · medioambiente
--   patrimonio · salud · aguas · vialidad · electricidad · defensa
--   bienes_nacionales
--
-- Criterio: se clasifica solo lo que es inequivoco. Las normas realmente
-- transversales (procedimiento administrativo, transparencia, tributaria,
-- municipalidades, gobierno regional, telecomunicaciones, consulta
-- indigena) quedan en NULL a proposito: una etiqueta equivocada es peor
-- que ninguna, porque el router la usaria para decidir cuando recuperarlas.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ── 1. Vocabulario: valores existentes fuera del canon ──────────────

update normas set dominio = 'accesibilidad' where dominio = 'Accesibilidad';
update normas set dominio = 'copropiedad'   where dominio = 'Copropiedad';
update normas set dominio = 'electricidad'  where dominio = 'energia';
update normas set dominio = 'vialidad'      where dominio = 'infraestructura';

-- ── 2. El cajon de sastre 'otro' ────────────────────────────────────

update normas set dominio = case
    when titulo ilike '%DDU%'                        then 'urbanismo'
    when titulo ilike '%pequeña propiedad%'          then 'urbanismo'
    when titulo ilike '%Concesiones Marítimas%'      then 'bienes_nacionales'
    when titulo ilike '%bienes del Estado%'          then 'bienes_nacionales'
    when titulo ilike '%Fomento Forestal%'           then 'medioambiente'
    when titulo ilike '%DL 701%'                     then 'medioambiente'
    when titulo ilike '%Bosque Nativo%'              then 'medioambiente'
    else null   -- Convenio 169 y consulta indigena: transversales
end
where dominio = 'otro';

-- ── 3. Los que se deducen del tipo, sin ambiguedad ──────────────────

-- Dictamenes de Contraloria en materia urbanistica
update normas set dominio = 'urbanismo'
where dominio is null and tipo = 'CGR';

-- Circulares DDU: por definicion interpretan la OGUC
update normas set dominio = 'urbanismo'
where dominio is null and tipo in ('DDU', 'DDU_ESPECIFICA');

-- DL 3.516, division de predios rusticos
update normas set dominio = 'urbanismo'
where dominio is null and tipo = 'DL' and titulo ilike '%predios rústicos%';

-- ── 4. Leyes y decretos supremos, por materia del titulo ────────────

update normas set dominio = case
    -- medio ambiente
    when titulo ilike '%Medio Ambiente%'              then 'medioambiente'
    when titulo ilike '%Tribunales Ambientales%'      then 'medioambiente'
    when titulo ilike '%residuos%'                    then 'medioambiente'
    when titulo ilike '%bosque nativo%'               then 'medioambiente'
    when titulo ilike '%reforestación%'               then 'medioambiente'
    when titulo ilike '%DL 701%'                      then 'medioambiente'
    when titulo ilike '%calidad ambiental%'           then 'medioambiente'
    -- aguas
    when titulo ilike '%Código de Aguas%'             then 'aguas'
    when titulo ilike '%aguas lluvias%'               then 'aguas'
    when titulo ilike '%Agua Potable%'                then 'aguas'
    when titulo ilike '%Agua y Alcantarillado%'       then 'aguas'
    when titulo ilike '%Servicios Sanitarios%'        then 'aguas'
    -- salud
    when titulo ilike '%accidentes del trabajo%'      then 'salud'
    when titulo ilike '%16.744%'                      then 'salud'
    when titulo ilike '%Sanitario de los Alimentos%'  then 'salud'
    -- energia
    when titulo ilike '%Transmisión Eléctrica%'       then 'electricidad'
    when titulo ilike '%Gas%'                         then 'electricidad'
    -- vialidad
    when titulo ilike '%Ley de Caminos%'              then 'vialidad'
    when titulo ilike '%Ley de Tránsito%'             then 'vialidad'
    -- patrimonio
    when titulo ilike '%Monumentos Nacionales%'       then 'patrimonio'
    -- copropiedad
    when titulo ilike '%Copropiedad%'                 then 'copropiedad'
    -- construccion
    when titulo ilike '%Sísmico%'                     then 'construccion'
    when titulo ilike '%Hormigón%'                    then 'construccion'
    -- urbanismo
    when titulo ilike '%regularización de p%'         then 'urbanismo'
    when titulo ilike '%Subsidio Habitacional%'       then 'urbanismo'
    else null   -- transversales: quedan sin etiqueta a proposito
end
where dominio is null and tipo in ('LEY', 'Ley', 'DS', 'DFL');

-- ── 5. Organo emisor: rellenar vacios y unificar duplicados ─────────

update normas set organo_emisor = 'Contraloría General de la República'
where organo_emisor is null and tipo = 'CGR';

update normas set organo_emisor = 'MINVU · División de Desarrollo Urbano'
where organo_emisor is null and tipo in ('DDU', 'DDU_ESPECIFICA');

update normas set organo_emisor = 'Congreso Nacional'
where organo_emisor in ('CONGRESO', 'Congreso Nacional / MINVU');

-- Las leyes de la Republica las dicta el Congreso, sin excepcion
update normas set organo_emisor = 'Congreso Nacional'
where organo_emisor is null and tipo in ('LEY', 'Ley');

-- Decretos supremos: el ministerio se deduce de la materia.
-- OJO: esta parte es inferencia, no dato de origen. Revisar si algun
-- decreto quedo atribuido al ministerio equivocado.
update normas set organo_emisor = case
    when titulo ilike '%Sísmico%'                    then 'MINVU'
    when titulo ilike '%Hormigón%'                   then 'MINVU'
    when titulo ilike '%Subsidio Habitacional%'      then 'MINVU'
    when titulo ilike '%Agua Potable%'               then 'MOP'
    when titulo ilike '%Agua y Alcantarillado%'      then 'MOP'
    when titulo ilike '%Servicios Sanitarios%'       then 'MOP'
    when titulo ilike '%Sanitario de los Alimentos%' then 'MINSAL'
    when titulo ilike '%accidentes%'                 then 'Ministerio del Trabajo'
    when titulo ilike '%reforestación%'              then 'MINAGRI'
    when titulo ilike '%DL 701%'                     then 'MINAGRI'
    when titulo ilike '%predios rústicos%'           then 'MINAGRI'
    when titulo ilike '%calidad ambiental%'          then 'Ministerio del Medio Ambiente'
    when titulo ilike '%Gas%'                        then 'Ministerio de Energía'
    when titulo ilike '%Consumo de Energ%'           then 'Ministerio de Energía'
    else organo_emisor
end
where organo_emisor is null and tipo in ('DS', 'DL');

-- Rezagado: el reglamento de instalaciones de consumo de energia no
-- entraba por el patron '%Gas%'
update normas set dominio = 'electricidad'
where dominio is null and titulo ilike '%Instalaciones de Consumo de Energ%';

-- ── 6. Dominio nuevo: administrativo ────────────────────────────────
--
-- Las que quedaban sin dominio no caben en las 12 materias tecnicas
-- porque son transversales: procedimiento administrativo, transparencia,
-- telecomunicaciones, ley indigena y consulta indigena, organica de
-- municipalidades y de gobierno regional, tributaria y Convenio 169.
-- Aplican a cualquier proyecto sin ser de una materia en particular.
--
-- Requiere los cambios de codigo correspondientes, ya aplicados:
--   src/lib/clasificador.ts — 'administrativo' en DominioPrimario y en
--                             las instrucciones del clasificador
--   src/lib/router.ts       — entrada en DOMINIO_A_NORMAS

update normas set dominio = 'administrativo' where dominio is null;

commit;

-- ═══════════════════════════════════════════════════════════════════
-- Resultado: 420 normas · 0 sin dominio · 0 sin organo emisor
--
-- urbanismo 357 · medioambiente 16 · aguas 10 · administrativo 10
-- salud 8 · construccion 4 · electricidad 4 · vialidad 3
-- bienes_nacionales 3 · copropiedad 2 · patrimonio 2 · accesibilidad 1
-- ═══════════════════════════════════════════════════════════════════
