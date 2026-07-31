# Auditoría de integridad y brechas normativas

Fecha de corte: 30 de julio de 2026  
Alcance: corpus productivo de REVISOR ARQ

## Resumen ejecutivo

El corpus contiene 425 registros normativos y todos poseen chunks, pero la
existencia de chunks no garantiza que la fuente corresponda a la norma
declarada. Se detectaron fuentes cruzadas, normas derogadas marcadas como
vigentes y colisiones de identidad entre decretos del mismo número emitidos por
ministerios distintos.

Antes de ampliar el corpus debe cambiarse la identidad técnica de una norma.
`tipo + numero` no es una clave suficiente. La clave canónica debe incorporar,
como mínimo:

- tipo;
- número;
- año;
- órgano emisor;
- identificador oficial BCN (`idNorma`) cuando exista.

Ejemplo crítico: el DS 30 ambiental y el DS 30 del Ministerio de Transportes
sobre mitigación de impactos al sistema de movilidad local son normas
distintas. Con la identidad actual una puede sobrescribir a la otra.

## Correcciones prioritarias del corpus existente

1. Reemplazar Ley 19.300 por texto oficial BCN `idNorma=30667`.
2. Reemplazar Ley 21.442 por la Nueva Ley de Copropiedad Inmobiliaria,
   `idNorma=1174663`, y corregir su título.
3. Marcar Ley 19.537 como derogada, conservándola solo para análisis histórico
   y transitorio.
4. Reemplazar las fuentes cruzadas de DFL 340, DFL 850 y Ley 18.290.
5. Separar y corregir las DDU 407/519, 467/521, 478/492 y 487/511.
6. Consolidar duplicados DS 109, DS 1199, DS 193, DS 259, DS 50, DS 60 y DS 61,
   sin eliminar versiones históricas que tengan períodos de vigencia distintos.
7. Reemplazar fuentes genéricas de DS 30, DS 38 y DS 40 ambientales por el
   documento oficial individual.

## Estado de saneamiento aplicado — 30 de julio de 2026

Las correcciones anteriores ya fueron aplicadas al corpus de producción:

- 411 registros quedaron activos y 14 registros duplicados, derogados o
  incorrectamente separados quedaron inactivos, sin eliminar su trazabilidad;
- no quedan URLs activas mal formadas, páginas institucionales genéricas ni
  fuentes compartidas por dos normas activas;
- se corrigieron las fuentes e identidades de DDU 467, 478, 487 y 519;
- se consolidaron los duplicados DS 38, 50, 60, 61, 109, 1199, 193 y 259;
- se corrigieron las fuentes e identidades BCN de DFL 382, DFL 725, DL 1939,
  DL 2695, DS 30, DS 38, DS 40, DS 148, DS 236, DS 66 y las leyes sectoriales
  auditadas;
- el registro rotulado DS 660 fue reclasificado como DS 9 de 2018, conforme a
  su contenido real sobre concesiones marítimas;
- el registro rotulado DS 93 fue reclasificado como DS 26, pues contiene la
  modificación de 2011 al reglamento de bosque nativo;
- el registro “Ley 4677” fue reclasificado como Resolución Exenta 4.677 de
  Vialidad;
- las DDU históricas `DDU_001`, `DDU_010`, `C55`, `C100`, etc. fueron
  normalizadas a su número real;
- los anexos separados de DDU 457 y DDU 516 fueron reunidos con su circular;
- la fuente e identidad almacenadas en cada chunk quedaron sincronizadas con
  la ficha normativa: la auditoría final arrojó cero desfases;
- el buscador vectorial, el buscador de emergencia y la recuperación forzada
  excluyen normas inactivas.

Quedan 38 DDU históricas activas sin URL oficial individual. Su contenido fue
conservado, pero no se les asignó una dirección inferida o genérica. Deben
completarse sólo al disponer del archivo o enlace oficial verificable.

## Normativa faltante — prioridad crítica

### Permisos y procedimiento transversal

- **Ley 21.770, Ley Marco de Autorizaciones Sectoriales** — regula desde 2025
  el marco, clasificación, procedimiento y plataforma de autorizaciones
  sectoriales. BCN `idNorma=1216930`.

### Medio ambiente y emplazamiento

- **Ley 21.202 sobre humedales urbanos** — puede incidir directamente en
  permisos de subdivisión, loteo, urbanización y construcción.
  BCN `idNorma=1141461`.
- **DS 15/2020 MMA, Reglamento de la Ley 21.202**.
  BCN `idNorma=1152029`.
- **Ley 21.600, Servicio de Biodiversidad y Áreas Protegidas** — incorpora
  áreas protegidas, sitios prioritarios y zonas de amortiguación.
  BCN `idNorma=1195666`.
- **Ley 21.455, Ley Marco de Cambio Climático**.
  BCN `idNorma=1177286`.

### Movilidad y espacio público

- **Ley 20.958, Sistema de Aportes al Espacio Público**.
  BCN `idNorma=1095541`.
- **DS 30/2017 MTT**, publicado en 2019, Reglamento sobre Mitigación de
  Impactos al Sistema de Movilidad Local.
  BCN `idNorma=1131679`.

### Seguridad sanitaria e industrial

- **DS 43/2015 MINSAL, Reglamento de Almacenamiento de Sustancias Peligrosas**.
  BCN `idNorma=1088802`.
- **DS 57/2019 MINSAL, Reglamento de Clasificación, Etiquetado y Notificación
  de Sustancias Químicas y Mezclas Peligrosas**.
  BCN `idNorma=1155752`.

## Normativa faltante — segunda prioridad

Estas normas deben verificarse e incorporarse según los tipos de proyecto que
la aplicación decida cubrir:

- Ley 21.364, Sistema Nacional de Prevención y Respuesta ante Desastres;
- Ley 21.595, delitos económicos y atentados contra el medio ambiente;
- DS 46, descargas de residuos líquidos a aguas subterráneas;
- DS 609, descargas de residuos industriales líquidos a alcantarillado;
- DS 4, manejo de lodos de plantas de tratamiento;
- reglamentos y resoluciones de implementación dictados bajo Ley 21.770;
- normativa aeronáutica, portuaria, ferroviaria y minera para proyectos
  emplazados en sus respectivas zonas de restricción.

## Reglas de aceptación para nuevas fuentes

Una norma no debe ingresar a producción si no cumple simultáneamente:

1. fuente primaria oficial individual;
2. número, año, ministerio y título concordantes;
3. texto real, no HTML de navegación, portada ni resumen;
4. artículos detectables y conteo mínimo razonable;
5. hash de contenido y fecha de descarga;
6. estado de vigencia y período de aplicación;
7. prueba de recuperación por número y por materia;
8. evaluación de una respuesta positiva y una consulta trampa.

## Recepción e incorporación BCN — 30 de julio de 2026

Se validaron las fichas XML recibidas contra su identidad interna y se
descargó el PDF completo de la versión vigente desde BCN antes de la ingesta.
Quedaron incorporadas y activas las siguientes diez fuentes: Leyes 20.958,
21.202, 21.442, 21.455, 21.600 y 21.770; DS 15/2020 MMA, DS 30/2017 MTT
(publicado en 2019), DS 43/2015 MINSAL y DS 57/2019 MINSAL. La carga sumó
1.858 chunks con URL BCN, año, organismo emisor e idNorma trazables.

La Ley 21.442 reemplazó el contenido anterior que correspondía a su
reglamento y se encontraba bloqueado. También se eliminó la restricción
heredada que impedía distinguir decretos sectoriales con el mismo número:
coexisten correctamente el DS 30/2017 MTT y el DS 30/2023 MMA.

La segunda descarga corrigió los siete archivos observados. Se validaron e
incorporaron DS 4/2009 MMA, DS 46 (publicado en 2003), DS 609/1998 MOP, Ley
17.288, Ley 21.305, Ley 21.364 y Ley 21.595: 323 chunks adicionales, todos
vigentes y enlazados a su ficha BCN. La validación ahora acepta XML con
articulado completo, conserva la fuente original y bloquea inconsistencias de
tipo, número, identificador y fechas centinela futuras.

## Estabilización de respuestas y despliegue — 30 de julio de 2026

El corpus productivo mantiene **17 normas sectoriales activas**. Se normalizó
la referencia explícita a las fuentes recuperadas, para que las respuestas
puedan vincular cada conclusión normativa con evidencia verificable.

Se verificaron fallbacks cautelares para los siguientes escenarios: Ley 21.595,
evaluación ambiental mediante SEIA, copropiedad inmobiliaria y obras en área
verde o bien nacional de uso público. Ante una falla transitoria de redacción,
el sistema conserva una respuesta verificable y no entrega una conclusión
genérica o permisiva sin respaldo.

Los cambios fueron desplegados y verificados en producción. Las consultas
trampa asociadas a SEIA, asamblea de copropietarios y quiosco en área verde
quedaron validadas con recuperación de fuentes pertinentes.

## Automatización y alertas operativas — 30 de julio de 2026

Se incorporó un flujo de GitHub Actions para ejecutar semanalmente y de forma
manual las pruebas determinísticas y la compilación. Este flujo no consume
modelos de IA ni consulta el endpoint conversacional.

También se habilitó el envío de alertas por correo desde el monitor de
vigencia. Ante un cambio normativo detectado, REVISOR ARQ notifica a
skog.petter@gmail.com mediante SMTP de Gmail. Un error de correo queda
registrado, pero no interrumpe la verificación normativa ni la aplicación.

Verificación de cierre: 96 pruebas automatizadas aprobadas, compilación de
producción exitosa y endpoint de salud productivo respondiendo HTTP 200.
