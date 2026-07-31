-- ═══════════════════════════════════════════════════════════════════
-- Corrige 2 valores de organo_emisor encontrados al verificar contra
-- BCN (Biblioteca del Congreso Nacional) los 19 decretos supremos cuyo
-- organo_emisor había quedado como inferencia por materia en la
-- migración 20260725_normalizar-dominios.sql.
--
-- De esos 19, 17 resultaron correctos (verificados uno a uno contra
-- BCN, MINVU, SUSESO, MOP, etc. — ver HANDOFF-2026-07-25.md). Dos NO:
-- ═══════════════════════════════════════════════════════════════════

begin;

-- DS 66/2007 "Reglamento de Instalaciones Interiores y Medidores de Gas"
-- La migración anterior lo atribuyó a 'Ministerio de Energía' por el
-- patrón '%Gas%'. Error: el Ministerio de Energía no existía en 2007
-- (se creó en 2010). Según BCN y el propio Ministerio de Energía (que
-- se refiere a este decreto como heredado), el DS 66 lo dictó "el
-- entonces Ministerio de Economía, Fomento y Reconstrucción" — hoy
-- Ministerio de Economía, Fomento y Turismo.
-- Fuente: https://energia.gob.cl/consultas-publicas/propuesta-de-modificacion-del-decreto-supremo-ndeg-66-de-2007-del-entonces-ministerio-de-economia-fomento-y-reconstruccion-que-aprueba-reglamento-de-instalaciones-interiores-y-medidores-de-gas
update normas
set organo_emisor = 'Ministerio de Economía, Fomento y Turismo'
where id = 'b8d3bbf5-b429-4b32-bf29-38f76fe3e648'; -- DS 66-GAS

-- DS 193 "Reglamento del DL 701" — no era parte de la inferencia de esta
-- migración (ya tenía un valor no-nulo, por eso no lo tocó), pero el
-- valor 'Ministerio' está truncado/incompleto. Su fila duplicada
-- (numero '193-1998', id e40f9fce-a49e-4614-bb44-9f3d7b6638f2) sí tiene
-- el valor correcto: MINAGRI. Se pareja el mismo decreto.
-- Fuente: https://www.bcn.cl/leychile/navegar?idNorma=7155 (DL 701 y su
-- reglamento general, ambos del Ministerio de Agricultura)
update normas
set organo_emisor = 'MINAGRI'
where id = '85fb3aca-f959-4105-8f29-aa4b2032a5bc'; -- DS 193

commit;
