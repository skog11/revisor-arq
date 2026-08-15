# Handoff: landing modular de REVISOR ARQ

Fecha: 2026-08-05  
Proyecto efectivo: `C:\00_CLAUDE CODE\00_REVISOR ARQ\app`  
URL local: `http://localhost:3000`

## Objetivo vigente

La pagina de inicio debe presentar REVISOR ARQ como una plataforma de consulta normativa con IA que responde solo cuando existe respaldo verificable. La experiencia principal es una transicion controlada por scroll: se inicia cubierta por planos y documentos tecnicos, los elementos se abren de manera individual, aparece la ciudad modular y termina en una landing estatica navegable.

No se esta implementando la antigua animacion de ciudad de carton de 12-15 segundos. Sus fotogramas se conservaron como material de exploracion, pero no son la direccion activa de la pagina.

## Estado actual

La landing esta implementada y compilaba correctamente con `npm run build` al cierre de este handoff. El servidor de produccion local fue iniciado en el puerto `3000`.

La transicion actual tiene cuatro momentos, inspirados directamente en la referencia `codex-clipboard-c68cafe5-cb77-4701-ad77-c591b73d17f6.png`:

1. Inicio: documentos, planos, dictamenes y utiles de dibujo cubren el viewport; el texto central sigue legible a traves de un vacio compositivo.
2. Apertura: cada hoja se desplaza individualmente hacia su lado, con tiempos y trayectorias escalonadas.
3. Despeje: la ciudad modular aparece bajo el texto central; aun quedan documentos en los bordes.
4. Final: documentos y escena introductoria desaparecen completamente; queda la landing fija con ciudad y dock navegable.

La escena introductoria se oculta desde `scrollYProgress >= 0.87`. Esto evita el efecto fantasma de documentos sobre la pagina final.

## Archivos clave

### Componente y estilos

- `src/components/landing-modular/landing-modular.tsx`: composicion, datos de los seis destinos, capas de documentos y mapeos de scroll de Framer Motion.
- `src/components/landing-modular/landing-modular.module.css`: layout responsive, capas de la intro, tiempos visuales, hero final y estilos del dock.
- `src/components/ui/magnetic-dock.tsx`: dock centrado con efecto magnetico.
- `src/components/ui/magnetic-dock.module.css`: estilo y escala del dock.
- `src/app/page.tsx`: punto de entrada de la pagina principal. No sustituir sin comprobar que renderiza `LandingModular`.

### Activos de la landing

- `public/landing/ciudad-modular-limpia.png`: ciudad maestra de la landing final. Es la imagen que el usuario pidio mantener exactamente.
- `public/landing/documents-v2/`: documentos individuales usados por la intro. No volver a usar collages o recortes con contenido mezclado.
- `public/landing/documents-v2/regla.png`, `lapiz-rojo.png`, `lapiz-negro.png`: utiles independientes que tambien se desplazan por scroll.
- `public/landing/districts/`: recortes individuales de cada manzana. Por ahora la landing final usa la ciudad maestra como base y hotspots sobre ella; no fingir animacion de personas o vehiculos con CSS.
- `public/landing/district-videos/README.md`: especificacion para los videos que el usuario entregara. Preferencia: WebM VP9 con alpha; alternativa: video con chroma key para recorte.
- `scripts/landing/generate-document-assets.mjs`: generador Sharp de los documentos `documents-v2`. Usarlo si hay que regenerarlos o ampliar la coleccion.

## Navegacion de la ciudad

Cada manzana es una entrada funcional, no decorativa. Los destinos estan definidos en `DISTRICTS`:

| Modulo | Etiqueta de menu | Nombre arquitectonico | Ruta |
| --- | --- | --- | --- |
| 01 | Consulta | Centro de inteligencia normativa | `/chat` |
| 02 | Archivo | Archivo normativo | `/archivo` |
| 03 | Guias | Escuela de casos | `/guias` |
| 04 | Como funciona | Taller de metodologia | `/como-funciona` |
| 05 | Mi cuenta | Oficina personal | `/dashboard` |
| 06 | Contacto | Centro de atencion | `/contacto` |

Al pasar por una manzana se muestra su etiqueta. La futura animacion de vida de cada manzana debe incorporarse con los videos entregados por el usuario, manteniendo estas rutas y hotspots.

## Decisiones de diseno ya tomadas

- El producto se describe con la idea: "Consulta normativa. Respuestas verificables." No debe prometer normas o parametros inventados.
- La landing final usa `REVISOR ARQ` en gran formato; el encabezado superior izquierdo muestra solo la marca arquitectonica, no el nombre repetido.
- El fondo es papel claro. No confundirlo con el kraft de las maquetas de carton de exploraciones anteriores.
- El dock es un elemento central, amplio y navegable, no una barra secundaria pequena.
- La ciudad final debe conservar la geometria, encuadre y sombras de `ciudad-modular-limpia.png`.
- Los papeles de la intro deben ser documentos coherentes e individuales: dictamenes, permisos, planos de arquitectura/edificacion, memorias tecnicas, certificados, ordenanzas y croquis. Nunca usar texturas cuadradas que mezclen varias hojas.
- La transicion es solo de acceso a la landing. Una vez despejada, la landing final debe permanecer estatica; no debe continuar una pagina de scroll narrativo.
- En movil, la intro de scroll se desactiva y se entrega directamente la landing final por claridad y rendimiento.

## Ajustes tecnicos importantes

### Transicion de scroll

`LandingModular` usa `useScroll` sobre una seccion de `650svh`, con `position: sticky` para fijar el viewport durante la apertura. Los valores relevantes estan en el componente:

- Cada `DocumentSheet` usa `start`, `opening` y `exit` segun su propiedad `wave`.
- `introCopy` se ve primero y se desvanece antes de la landing final.
- `introCity` entra en el tramo medio, queda bajo el texto y se retira antes del final.
- `surfaceOpacity` se mantiene en cero hasta el despeje tardio; esto se corrigio para evitar que la landing final apareciera como fantasma detras de la intro.
- `sceneOpacity` baja entre 0.78 y 0.86; `introCleared` desmonta visualmente la escena desde 0.87.

Si se modifica esta secuencia, probar manualmente al menos los progresos aproximados 0%, 35-45%, 65-75% y 100%. El resultado esperado es que no haya capas duplicadas de texto, dock o documentos en ningun punto.

### Fondo de ciudad en la fase intermedia

La imagen de ciudad maestra tiene fondo opaco. En la fase intermedia se usa `mix-blend-mode: multiply` y no se debe aplicar `drop-shadow` al PNG completo, porque produciria una sombra rectangular alrededor de todo el lienzo. La landing final no usa esa mezcla: conserva la imagen original sin alterarla.

## Pendientes prioritarios

1. Validar visualmente la transicion con el usuario en escritorio. Puede pedir ajustes de ritmo, escala o posicion de las hojas; realizar esos cambios en los mapeos de Framer Motion, no reemplazando todo el enfoque.
2. Esperar los videos de cada manzana. Al recibirlos:
   - comprobar que tengan alpha o chroma key limpio;
   - cargar un video por manzana dentro de los limites del hotspot;
   - reproducir solo en hover/focus y pausarlo al salir;
   - respetar `prefers-reduced-motion`;
   - no alterar la imagen maestra base.
3. Si el usuario exige mayor precision de recortes de manzana, generar mascaras reales a partir de la ciudad maestra y usarlas en SVG `clipPath` o PNG con transparencia. No usar cajas rectangulares aproximadas como solucion final.
4. Revisar rutas reales de `/archivo`, `/guias`, `/como-funciona`, `/dashboard` y `/contacto` antes de añadir nuevas interacciones. Existen actualmente, pero el contenido y autenticacion de algunas puede requerir trabajo de producto separado.
5. Si se requieren mejores documentos iniciales, ampliar el generador en `scripts/landing/generate-document-assets.mjs` y regenerar solo `documents-v2`; no editar los PNG a mano ni reutilizar el viejo directorio `documents`.

## Riesgos y limites

- El arbol Git esta muy sucio y contiene cambios masivos ajenos a la landing, incluidos scripts, API, corpus y migraciones. No hacer `git reset`, `checkout --` ni reversiones globales. Limitar el trabajo a los archivos de landing salvo instruccion explicita.
- `git diff --check` reporta espacios finales en archivos de ingest existentes; no pertenecen a esta landing.
- La ciudad de la fase intermedia es una imagen plana, por eso no puede tener vida real sin los videos futuros o recortes/marcaras precisas.
- No hay que depender de que un proceso previo siga vivo. Para iniciar localmente:

```powershell
Set-Location 'C:\00_CLAUDE CODE\00_REVISOR ARQ\app'
npm run build
npm run start
```

Para desarrollo iterativo se puede usar `npm run dev`.

## Verificacion recomendada

```powershell
Set-Location 'C:\00_CLAUDE CODE\00_REVISOR ARQ\app'
npm run build
```

Adicionalmente, abrir `http://localhost:3000` y verificar:

- al inicio, los documentos cubren el viewport sin texturas mezcladas;
- en la apertura, las hojas salen individualmente y el texto central queda claro;
- en el despeje, no se ve la landing final prematuramente;
- al final, no queda ningun documento fantasma, el dock esta centrado y cada manzana muestra su etiqueta y abre su ruta.
