-- Normaliza el único valor histórico `Ley` al valor canónico `LEY`.
--
-- La recuperación filtra `normas.tipo` con igualdad exacta. Mientras haya
-- registros con ambas grafías, el catálogo y cualquier consumidor externo
-- deben conocer las dos. Esta migración deja un único valor persistido;
-- los filtros de la aplicación mantienen ambas variantes temporalmente para
-- ser tolerantes durante la transición.

begin;

update public.normas
set tipo = 'LEY'
where tipo = 'Ley';

commit;
