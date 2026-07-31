# ESPECIFICACION DE MOVIMIENTO

## Decision de produccion

La animacion principal sera hibrida. ComfyUI puede generar estados visuales y, opcionalmente, un clip atmosferico corto; la continuidad narrativa y las capas normativas se implementaran en el navegador.

No depender de un video generativo largo para construir toda la ciudad. La geometria debe permanecer estable para que los hitos y las capas interactivas coincidan.

## Secuencia web principal

### Estado 1: plano territorial

Usar el activo creado desde `Promt Imagen inicial.md`.

- Duracion orientativa: 1,2 a 1,8 segundos.
- Leve acercamiento de camara.
- Aparicion progresiva de trazos mediante mascara o SVG.
- Sin manos, herramientas, particulas ni efectos digitales.

### Estado 2: transformacion material

Transicionar desde la lamina inicial hacia la imagen canonica.

- Duracion orientativa: 1,5 a 2,2 segundos.
- Morph o disolucion localizada por familias: topografia, agua, calles, edificios y vegetacion.
- Mantener camara y puntos de anclaje fijos.
- Revelar textura y volumen; no simular explosiones ni edificios rebotando.

### Estado 3: ciudad terminada

Usar `FONDO LANDING PAGE 5504x3072.png` o su version web optimizada.

- Pausa breve para permitir lectura.
- Movimiento ambiental casi imperceptible.
- Activar el texto y los controles HTML despues de estabilizar la escena.

### Estado 4: analisis del predio

Implementar con SVG y CSS sobre el predio real.

- limite y linea oficial como tinta tecnica;
- retiros como papel vegetal;
- altura como volumen de papel translucido;
- restricciones como tramas editoriales;
- fundamento como lamina lateral.

Estas capas no deben formar parte del video, porque necesitan responder al scroll, teclado, clic y toque.

## Clip opcional de ComfyUI

Crear solo si la composicion puede permanecer bloqueada.

Prompt:

Create a short cinematic transition between the supplied architectural plan state and the supplied finished REVISOR ARQ paper city. Lock the exact camera, framing, geography and position of every element. The graphite plan gains physical paper thickness; stacked kraft contour layers rise subtly; matte turquoise waterways appear; streets, bridges, buildings and folded-paper vegetation assemble in place. Motion is precise, tactile and restrained, like a museum model being constructed through stop-motion craftsmanship. Warm studio light from the upper left, delicate shadows, visible paper fibers and balsa wood. End on the supplied finished image and hold the exact final frame. No camera orbit, no changed architecture, no invented elements, no text, no logos, no particles, no neon.

Duracion maxima: 4 a 6 segundos.

Descartar el clip si el ultimo fotograma no puede alinearse con la imagen canonica.

## Accesibilidad y rendimiento

- Con `prefers-reduced-motion`, omitir construccion y mostrar la ciudad terminada.
- El CTA debe estar disponible sin esperar la animacion.
- No reproducir video pesado en conexiones lentas o modo ahorro de datos.
- Usar poster estatico y cargar el clip despues del contenido critico.
- Evitar loop permanente.

## Principio de movimiento

La experiencia tiene un unico gesto memorable: el territorio dibujado adquiere materia y se convierte en una ciudad consultable. Todo el movimiento posterior debe ser mas silencioso que ese momento.
