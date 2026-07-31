# PLAN DE IMPLEMENTACION LANDING REVISOR ARQ

## Objetivo

Construir una landing narrativa y accesible alrededor de la ciudad canonica, usando ComfyUI para derivados visuales controlados y el frontend para movimiento, capas normativas e interaccion.

La implementacion se considera terminada cuando la experiencia comunica una secuencia clara: terreno, pregunta, condiciones, fundamento, respuesta y acceso al producto.

## Principios de trabajo

1. La imagen canonica no cambia de geografia.
2. Los activos se aprueban antes de fijar coordenadas interactivas.
3. La escena funciona primero como imagen estatica y despues recibe movimiento.
4. Las capas normativas son SVG y HTML, no elementos generados dentro de una imagen.
5. Movil, teclado y movimiento reducido forman parte de la primera implementacion.
6. Cada fase debe poder probarse y aprobarse de forma independiente.

## Fase 0. Auditoria tecnica

### Trabajo

- Revisar la pagina actual y todos los componentes de `app/src/components/ciudad`.
- Identificar piezas reutilizables, dependencias de animacion y estilos globales.
- Registrar los cambios existentes en el arbol de trabajo para no sobreescribir trabajo ajeno.
- Medir tamaño, dimensiones, formato y perfil de color de ambas imagenes.
- Verificar el flujo local de ComfyUI y los modelos disponibles antes de definir un workflow definitivo.

### Entregable

Mapa de componentes: conservar, adaptar, reemplazar y retirar.

### Aceptacion

Se conoce el impacto real de la nueva landing y no hay archivos de usuario en riesgo.

## Fase 1. Preparacion de activos

### Trabajo en ComfyUI

- Crear la lamina inicial usando la imagen canonica como referencia estructural.
- Probar un acercamiento al predio.
- Probar un acercamiento al Centro de Inteligencia.
- Probar una variante de cierre con luz de ultima hora.
- Evaluar un clip de 4 a 6 segundos solo despues de aprobar los estados estaticos.

### Trabajo de imagen

- Crear variantes AVIF o WebP para escritorio, tablet y movil.
- Definir crops con zonas seguras para texto y controles.
- Mantener el PNG original como master, no como archivo servido al usuario.
- Preparar posters para cualquier video.

### Entregables

- `ciudad-hero` en tamaños responsive.
- `ciudad-plano-inicial`.
- `ciudad-predio`.
- `ciudad-centro-inteligencia`.
- `ciudad-cierre`.
- Video opcional y poster, solo si supera control de continuidad.

### Aceptacion

- Los seis anclajes definidos en los prompts permanecen alineados.
- No aparecen edificios o elementos inventados.
- Los crops mantienen contexto suficiente para comprender la ciudad.
- La carga inicial prevista es adecuada para web.

## Fase 2. Prototipo de encuadre

### Trabajo

- Crear una escena responsive con la ciudad como fondo semantico y controles HTML superpuestos.
- Definir `object-position`, escalado y zonas seguras por breakpoint.
- Comparar dos soluciones en movil: crop continuo y secuencia de acercamientos.
- Fijar las coordenadas relativas de predio, plaza, Centro de Inteligencia y edificios secundarios.
- Construir una herramienta temporal de calibracion para visualizar coordenadas sobre la imagen.

### Entregable

Hero estatico navegable en escritorio, tablet y movil.

### Aceptacion

- Predio, plaza y Centro de Inteligencia son visibles en el encuadre principal.
- El texto no cubre el foco narrativo.
- No hay saltos al cambiar de tamaño.
- Los hotspots coinciden con la imagen en todos los breakpoints soportados.

## Fase 3. Sistema de componentes

### Componentes propuestos

- `CiudadEscena`: imagen responsive, crops y transformacion de camara.
- `NarrativaCiudad`: estado de escenas y coordinacion con scroll.
- `HotspotsCiudad`: hitos accesibles y exploracion libre.
- `CapasPredio`: limites, condiciones y restricciones en SVG.
- `LaminaEditorial`: explicacion, fundamento y fuentes.
- `ControlesNarrativa`: avanzar, retroceder, omitir y reiniciar.

### Estado narrativo

- `territorio`
- `pregunta`
- `condiciones`
- `restricciones`
- `fundamento`
- `respuesta`
- `exploracion`

### Aceptacion

- El estado no depende exclusivamente de la posicion de scroll.
- Se puede entrar a una escena desde un CTA o hotspot.
- Retroceder no deja capas o textos en estados inconsistentes.
- La interfaz funciona sin video.

## Fase 4. Demostracion del predio

### Trabajo

- Dibujar el perimetro real del predio en un `viewBox` proporcional a la imagen.
- Crear capas SVG separadas para condiciones urbanisticas y territoriales.
- Diseñar una envolvente volumetrica sencilla en perspectiva para representar altura.
- Sincronizar capas con una narrativa de tres actos.
- Incluir una indicacion visible de que se trata de una demostracion conceptual.

### Contenido

Acto 1, condiciones urbanisticas:

- limite predial;
- linea oficial;
- retiros;
- altura;
- ocupacion;
- constructibilidad.

Acto 2, restricciones territoriales:

- riesgos;
- patrimonio;
- servidumbres;
- condiciones ambientales.

Acto 3, fundamento:

- condicion identificada;
- criterio aplicado;
- fuente;
- conclusion demostrativa.

### Aceptacion

- Las capas siguen la perspectiva y no parecen un mapa GIS.
- Cada acto puede comprenderse en pocos segundos.
- La demostracion no inventa cifras ni afirma validez normativa real.
- Los controles son utilizables con teclado y toque.

## Fase 5. Movimiento

### Trabajo

- Implementar la transicion plano-maqueta.
- Añadir un unico acercamiento de camara coordinado con la pregunta.
- Añadir revelado material de capas en el predio.
- Añadir entrada y salida de la lamina editorial.
- Integrar el clip de ComfyUI solo si mejora la experiencia y conserva continuidad.

### Aceptacion

- La animacion orienta la mirada y no retrasa la accion.
- No existe movimiento ornamental permanente.
- La experiencia reducida conserva contenido y orden.
- No hay cambios bruscos de layout ni problemas de scroll.

## Fase 6. Contenido y conversion

### Trabajo

- Revisar todos los textos en voz activa y lenguaje reconocible para arquitectos.
- Mantener una sola accion principal por escena.
- Conectar CTA inicial, predio y CTA final con el destino real del producto.
- Incorporar metodologia y fuentes sin convertir la landing en documentacion extensa.
- Mantener nomenclatura consistente: `Analizar este terreno`, `Consultar en REVISOR ARQ` y `Entrar a REVISOR ARQ`.

### Aceptacion

- La persona sabe que accion ocurrira antes de pulsar un boton.
- No hay promesas de precision que la demostracion no pueda respaldar.
- La propuesta de valor se comprende sin recurrir a lenguaje de IA generico.

## Fase 7. Validacion

### Pruebas funcionales

- Navegacion por teclado.
- Touch en movil.
- Scroll hacia adelante y atras.
- Entrada directa desde CTA.
- Movimiento reducido.
- Carga sin video.
- Recuperacion ante fallo de un activo.

### Pruebas visuales

- 1440 x 900.
- 1920 x 1080.
- 2560 x 1080 ultrawide.
- 768 x 1024 tablet.
- 390 x 844 movil.
- Tema claro y oscuro si ambos siguen siendo parte del producto.

### Pruebas de rendimiento

- LCP del hero.
- peso transferido inicial;
- estabilidad de layout;
- consumo de memoria durante animacion;
- carga diferida de acercamientos y video.

### Aceptacion

- No hay errores de consola.
- No hay contenido esencial inaccesible.
- El hero aparece con rapidez aun sin cargar activos secundarios.
- La ciudad mantiene lectura y composicion en todos los tamaños aprobados.

## Fase 8. Integracion y entrega

### Trabajo

- Ejecutar lint, typecheck y build.
- Revisar el diff completo y separar archivos generados de archivos fuente.
- Documentar rutas de activos y como regenerarlos.
- Actualizar el handoff con decisiones, limitaciones y trabajo pendiente.
- Preparar una version desplegable para revision visual.

### Aceptacion

- Build de produccion correcto.
- Documentos y codigo describen la misma experiencia.
- Los activos tienen nombres estables y formatos web.
- Existe un camino claro para reemplazar un derivado sin recalibrar toda la ciudad.

## Orden de ejecucion recomendado

1. Auditoria tecnica.
2. Lamina inicial y crops estaticos.
3. Hero responsive y calibracion de coordenadas.
4. Componentes y navegacion narrativa.
5. Demostracion SVG del predio.
6. Movimiento y ComfyUI opcional.
7. Contenido, accesibilidad y rendimiento.
8. Build, revision visual y handoff.

## Primera entrega funcional

La primera entrega no necesita video. Debe incluir:

- hero responsive con la imagen canonica optimizada;
- pregunta central;
- hotspots accesibles;
- acercamiento al predio;
- tres actos de analisis con SVG;
- lamina editorial;
- CTA final conectado al producto;
- soporte movil y movimiento reducido.

Una vez aprobada esta base, se incorporan lamina inicial, variante de cierre y clip cinematografico. Esto mantiene el valor principal de la experiencia incluso si ComfyUI no logra continuidad perfecta.
