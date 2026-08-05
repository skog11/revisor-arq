# Landing scroll documental — diseño

Fecha: 2026-08-05
Estado: aprobado en sesión de brainstorming, pendiente de plan de implementación

## 0. Qué documento manda

Este spec reemplaza la contradicción entre `00_FRONTEND_02/00_BRIEF_DEFINITIVO_LANDING.md`
(3 de agosto: landing editorial de seis secciones sobre una maqueta territorial) y
`00_FRONTEND_02/05_PROPUESTA_ACTIVA_SCROLL_DOCUMENTAL/00_HANDOFF/HANDOFF-LANDING-MODULAR-2026-08-05.md`
(5 de agosto: intro de documentos y ciudad modular estática).

Ninguno de los dos describe lo que se va a construir. Este sí.

Los dos documentos anteriores quedan como registro histórico. Cuando este spec y
cualquiera de ellos digan cosas distintas, manda este.

## 1. Alcance

### Entra en esta fase

- Landing nueva en `/landing-v2`, en modo claro solamente.
- Secuencia de entrada controlada por scroll, con GSAP + ScrollTrigger.
- Ciudad modular como menú, con los seis videos diurnos por manzana.
- Tres secciones de contenido más cierre.
- Navegación reordenada: header propio en la landing, dock en el header global del resto de la app, footer global restaurado en `/`.

### No entra en esta fase

- Modo oscuro y ciudad nocturna. Se diseña la estructura para recibirlo (sección 10), no se implementa.
- Segundo set de videos nocturnos.
- Reemplazar `/` — eso ocurre solo tras aprobación explícita viendo `/landing-v2`.
- Rediseñar `/chat`, `/archivo`, `/guias` ni ninguna otra ruta.
- Animación ComfyUI de construcción de la maqueta.

## 2. Decisiones tomadas

| # | Decisión | Elegido |
|---|---|---|
| 1 | Protagonista del scroll | Cámara sobre la ciudad: las hojas se abren y debajo la ciudad hace un travelling continuo |
| 2 | Largo de la página | Intro → ciudad → tres secciones → cierre |
| 3 | Tono | Papel claro, con modo oscuro en fase posterior |
| 4 | Videos por manzana | Dos sets a futuro; en esta fase solo los seis diurnos |
| 5 | Motor de animación | GSAP + ScrollTrigger, acotado a la landing |
| 6 | Menús duplicados | La ciudad es el menú; el dock sale del escritorio de la landing |
| 7 | Dock | Se conserva el propio (`magnetic-dock`), sin el reflejo `.shine`; no se adopta Magic UI ni Vengence UI |
| 8 | Header global | Se modifica: los cuatro enlaces actuales se reemplazan por el dock de siete destinos |

## 3. Arquitectura de la página

El principio de fondo: **el hero no es una pantalla que aparece cuando termina la
intro. El hero es el estado final de la intro.**

La implementación actual (`landing-modular.tsx`) mantiene la landing final y la escena
de documentos como dos capas separadas dentro del mismo `sticky`, cruzándose en
opacidad, con dos instancias distintas de la misma imagen de ciudad (`introCity` y
`cityBase`). De ahí vienen los fantasmas, el `introCleared` que desmonta a la fuerza
en `scrollYProgress >= 0.87`, y la dificultad para ajustar el ritmo.

En el diseño nuevo hay **una sola ciudad**, presente desde el primer frame. Lo que
cambia es la cámara sobre ella y lo que tiene encima.

Capas del hero fijado, de la más cercana al ojo hacia el fondo:

1. Cabecera fija — marca y CTA, viva desde el frame 0
2. Copy de entrada — se retira al abrirse
3. Hojas de expediente — 19, se abren en cuatro olas
4. Ciudad — travelling continuo

Cuando la línea de tiempo llega al final, todo está en reposo y eso ya es el hero.
Se suelta el pin y la página continúa.

Consecuencias:

- No hay fantasmas posibles porque no hay dos copias de nada. Desaparecen `introCleared`, `sceneOpacity`, `surfaceOpacity` y el desmontaje forzado.
- La ciudad nunca se remonta, lo que importa porque va a tener seis videos colgando.
- Ajustar el ritmo es mover una etiqueta de la línea de tiempo.
- El CTA está vivo desde el primer frame.

### Estructura

```
/landing-v2  →  <LandingV2 />
     [ fijado ~450vh ]  Secuencia de entrada  →  Ciudad-menú
     [ flujo normal  ]  El problema
                        El método
                        Cobertura real  (/api/stats)
                        Cierre + CTA
                        Footer global
```

### Archivos

```
src/components/landing-v2/
  landing-v2.tsx           orquesta el timeline maestro
  secuencia-entrada.tsx    las 19 hojas y el copy de apertura
  ciudad-menu.tsx          ciudad, videos, hotspots
  seccion-problema.tsx
  seccion-metodo.tsx
  seccion-cobertura.tsx    consume /api/stats
  cierre.tsx
  datos-hojas.ts           las hojas, sus cajas y sus olas
  datos-ciudad.ts          coordenadas reales de las seis manzanas
  landing-v2.module.css

scripts/landing/calcular-offsets-manzanas.mjs
```

No se importa nada de `src/components/ciudad/` ni de `src/components/landing-territorio/`.

## 4. Coreografía de entrada

Una sola línea de tiempo de GSAP con cuatro etapas nombradas, `scrub: 1.2`.

| Etapa | Tramo | Qué ocurre |
|---|---|---|
| cubierto | 0 → 18 % | Las 19 hojas cubren el viewport con un vacío compositivo al centro donde se lee el copy de apertura. La ciudad ya está montada a escala 1,55. Desde el 10 % empieza a derivar. |
| apertura | 18 → 60 % | Las cuatro olas de hojas salen, cada una por su vector, con rotación y escala leves. |
| revelación | 60 → 80 % | El copy de apertura se retira hacia arriba, salen las últimas hojas, la ciudad queda limpia. |
| asentado | 80 → 100 % | Entran el texto del hero y los hotspots. La ciudad llega a escala 1. Se suelta el pin. |

Olas de hojas, por `wave`:

| Ola | Inicia | Sale |
|---|---|---|
| 1 | 18 % | 62 % |
| 2 | 22 % | 68 % |
| 3 | 27 % | 76 % |
| 4 | 32 % | 83 % |

Reglas de ritmo:

- La ciudad se anima con `ease: "none"` — queda amarrada literalmente al scroll.
- Las hojas usan `power2.out` — desaceleran al salir. El contraste entre ambas es lo que da sensación de papel con peso.
- `scrub: 1.2` para que GSAP persiga la posición del scroll con retardo suave.

Variantes:

- **`prefers-reduced-motion`**: no hay pin ni línea de tiempo. Las hojas no se montan. El hero se renderiza directo en su estado final.
- **Móvil (≤900 px)**: la secuencia no se monta, igual que hoy. Se entrega la landing final directamente.

## 5. Ciudad y videos

Cada manzana se compone en tres capas:

```
PNG estático (póster, siempre presente)
   └── video WebM/alpha (aparece en hover o foco)
        └── etiqueta con nombre y destino
```

### Registro al pixel

Los seis recortes de `public/landing/districts/` están en tamaños distintos
(`archivo` 1214×868, `consulta` 963×880, `contacto` 982×786, `cuenta` 1124×899,
`guias` 1132×840, `metodo` 989×775) y la base es 1672×941. Hoy `DISTRICTS` los
posiciona con porcentajes estimados a ojo, lo que produciría un salto visible al
intercambiar el PNG por el video.

`scripts/landing/calcular-offsets-manzanas.mjs` desliza cada recorte sobre la base
buscando la posición de mínima diferencia y escribe las coordenadas reales en
`datos-ciudad.ts`. Los porcentajes estimados se eliminan.

### Comportamiento de los videos

- `preload="none"`. No se descarga nada hasta el primer hover.
- Reproducen en hover o foco de teclado; pausan y rebobinan al salir.
- Nunca reproducen bajo `prefers-reduced-motion`: queda el PNG.
- Solo uno reproduce a la vez.
- El PNG actúa como póster y como respaldo: si el WebM con alfa no carga, no se rompe nada.
- Techo de peso: 1,5 MB por video.

Especificación de entrega de los videos: `public/landing/district-videos/README.md`
(WebM VP9 con alfa, 4-6 s, 24 o 30 fps, bucle perfecto, cámara y geometría fijas).

### Pendiente abierto, no decidido

Los hotspots son rectángulos. Con el canal alfa de cada recorte se puede generar la
silueta real de la manzana y usarla como `clipPath`, de modo que el área clicable
siga el contorno del edificio. Más fiel, más trabajo. Queda para decidir después de
ver la primera versión funcionando.

## 6. Navegación

### Problema que resuelve

Hoy existen tres menús hacia los mismos seis destinos: los hotspots de la ciudad, el
dock magnético y los CTA del hero. `/chat` es alcanzable por cuatro caminos y
`/archivo` por tres. Además, `header.tsx:120` y `footer.tsx:16` ocultan header y
footer globales en `/`, lo que deja la portada sin descargo legal, sin acceso a
`/terminos` ni `/privacidad`, sin `ModeToggle` y sin estado de sesión.

### Reparto definitivo

**Header propio de la landing.** Lleva exactamente lo que la ciudad no puede llevar:

```
[marca]                    Planes   ☀/☾   Ingresar|avatar   [ Consultar → ]
```

Un solo ítem de navegación, `Planes` → `/pricing`, porque es la única ruta pública
sin otro hogar y enterrarla en el pie es un error comercial. Más `ModeToggle` y
estado de sesión, que hoy faltan en la portada.

**Ciudad.** Los seis destinos del producto: `/chat`, `/archivo`, `/guias`,
`/como-funciona`, `/dashboard`, `/contacto`.

**Footer global.** Se restaura en `/` quitando el `return null` de `footer.tsx:16`.
Devuelve `/pricing`, `/terminos`, `/privacidad`, `/contacto` y el descargo profesional
obligatorio por la regla 4 de `CLAUDE.md`.

**Móvil.** La ciudad no es clicable bajo 900 px. El dock se monta ahí como lista de
los seis destinos, usando la transformación a dos columnas que ya trae
`magnetic-dock.module.css:180`.

### Header global de la app

Se modifica `header.tsx` con permiso explícito del usuario. Hoy publica cuatro
enlaces —Home, Consulta, Guías, Normativa— y el último apunta a `/corpus`, que está
protegida por `proxy.ts` y redirige a administración: cualquier visitante que lo
pinche rebota. Además `/archivo` y `/como-funciona` no son alcanzables desde dentro
de la app, lo que convierte a la ciudad en una puerta de una sola dirección.

El header global pasa a montar el mismo dock, con los siete destinos incluyendo
Inicio:

```
Inicio · Consulta · Archivo · Guías · Cómo funciona · Mi cuenta · Contacto
```

El dock va **dentro del header pegajoso, centrado**, con `iconSize` reducido. No
puede ir flotando al pie porque en `/chat` chocaría con el campo de escritura. El
componente ya recibe `iconSize`, `maxScale` y `magneticDistance` por props, así que
no requiere reescritura.

El avatar se mantiene aparte, para lo que el dock no puede hacer: cerrar sesión.

Concepto: **el dock es la ciudad plegada en una franja, para las páginas que no
tienen ciudad.** En `/` no aparece; ahí el mapa son las manzanas.

### Dock: qué cambia

Se elimina `.shine` (`magnetic-dock.module.css:84` y su `<span>` en
`magnetic-dock.tsx:94`), el degradado blanco diagonal sobre cada ficha.

No se adopta Magic UI Dock ni Vengence UI Glass Dock. El componente propio ya
implementa la misma escala magnética con suavizado de muelle (`iconSize`, `maxScale`
y `magneticDistance` equivalen a `magnification` y `distance` de Magic UI) y además
tiene tooltip con número y detalle, estado activo con regla oxidada, y
transformación completa a lista en móvil, que ninguna de las dos librerías trae. El
glass dock además contradice la prohibición explícita de paneles flotantes de vidrio.

### Extracción compartida

Se extrae un hook `useSesion()` con la lógica de sesión de Supabase que hoy vive
duplicada en `header.tsx:104-116`, para que el header de la landing y el global la
compartan.

### Cobertura de rutas resultante

| Ruta | Acceso |
|---|---|
| `/` | marca del header |
| `/chat` | hotspot · CTA del header · cierre |
| `/archivo` | hotspot · sección de cobertura |
| `/guias` | hotspot |
| `/guias/[slug]` | desde `/guias` |
| `/como-funciona` | hotspot |
| `/contacto` | hotspot · footer |
| `/dashboard` | hotspot · avatar |
| `/login` | header, sin sesión |
| `/pricing` | header (Planes) · footer |
| `/terminos` | footer |
| `/privacidad` | footer |
| `/admin` `/corpus` `/normativa` | sin enlace, deliberadamente: son administración |
| `/offline` | sin enlace, lo sirve el service worker |
| `/landing-clasica` | sin enlace, es respaldo |

## 7. Secciones de contenido

### El problema

Titular: *Un terreno no se entiende con una sola norma.*

Tres familias, no una lista de organismos: normativa principal, criterios e
interpretaciones, condicionantes sectoriales y territoriales. Tres láminas de papel
vegetal que se superponen sobre el mismo predio, cada una con etiqueta y explicación
breve. La maqueta permanece visible debajo: la idea es acumulación, no reemplazo.

Marcado explícitamente como escena conceptual. No se atribuyen normas reales al
predio de la imagen.

### El método

Tres pasos: recupera fuentes relevantes → cruza reglas, criterios y contexto →
redacta una respuesta con citas revisables.

Una sola animación orquestada al entrar en viewport. Texto corto y específico.
**Sin cifras escritas a mano** — nada de número de reglas ni de chunks, porque
envejecen.

### Cobertura real

Único bloque con números, y vienen de `GET /api/stats`, que devuelve
`totalNormas`, `totalChunks`, `porTipo` y `updatedAt`.

Requisitos de honestidad:

- El endpoint filtra `vigente = true`, así que la etiqueta debe decir **"normas vigentes indexadas"**, no "normas". De lo contrario la cifra no cuadra con las 420 declaradas en `CLAUDE.md` y parece un error.
- El endpoint tiene fallback silencioso que devuelve ceros. Si `totalNormas` es 0, **se oculta el bloque completo** en vez de anunciar "0 normas".
- Estados de carga y error explícitos.
- Enlace a `/archivo` como explicación completa de la cobertura.

### Cierre

Titular: *Comprende el territorio antes de decidir.*
CTA `Consultar normativa` → `/chat`. Secundario `Conocer la cobertura` → `/archivo`.
Debajo, el footer global con el descargo.

## 8. Accesibilidad

Requisito crítico propio de este diseño: una sección fijada de 450 vh contiene, desde
el primer frame, el texto del hero y los seis hotspots con opacidad 0. Sin tratamiento,
el foco de teclado aterriza en enlaces invisibles y la página hace scroll a saltos.

- Todo lo que aún no se revela lleva **`inert`** hasta que la línea de tiempo alcanza *asentado*. Nada invisible es enfocable.
- **"Saltar la introducción"** como primer elemento tabulable, que lleva al final del pin.

Resto de requisitos:

- Contenido esencial en HTML.
- Foco visible en todos los controles.
- Nombre accesible en los seis destinos.
- Navegación completa por teclado.
- Contraste AA.
- `prefers-reduced-motion`: escena estática, sin pin.
- Experiencia completa sin hover.
- Sin secuestro de scroll.
- Sin audio.

## 9. Rendimiento

Peso actual de los activos fuente de la portada:

```
documents-v2   20 archivos    3,7 MB
ciudad-modular-limpia         1,8 MB
districts       6 archivos    7,0 MB
                            ─────────
                             12,5 MB   sin contar videos
```

Hallazgos:

- `public/landing/documents-v2/plano-base.png` pesa 1.177 KB y **no está en la lista `DOCUMENTS`**: es un archivo huérfano de una iteración anterior. Se elimina.
- Los 7 MB de `districts/` hoy no se cargan: el campo `asset` está declarado en `DISTRICTS` pero nunca se renderiza. Entrarán en escena como pósters junto con los videos.
- `next/image` optimiza en la entrega, así que los bytes servidos son menores que las fuentes. Aun así el primer pintado necesita la primera ola de hojas más la ciudad.

Medidas:

- Convertir las fuentes a AVIF con el script de Sharp existente.
- `priority` únicamente para las hojas de la ola 1 y para la ciudad. El resto, diferido.
- Pósters de manzana cargando al entrar en viewport.
- Presupuesto explícito del primer viewport, verificado con medición, no supuesto.
- Separación de bundles: en escritorio la landing no monta el dock, así que carga solo GSAP; en móvil la secuencia no se monta, así que carga solo Framer Motion; las páginas interiores cargan solo Framer Motion. **Ninguna vista carga las dos librerías.** Esto es un requisito verificable, no un efecto automático: depende de que la separación se haga bien.
- Objetivos: LCP < 2,5 s en condiciones razonables, sin cambios de layout durante la carga.

## 10. Fase 2 — modo nocturno

No se implementa ahora, pero la estructura debe recibirlo sin rehacer nada.

- El botón día/noche se engancha a `next-themes`, ya instalado y cableado (`ThemeProvider` en `layout.tsx:92`, `mode-toggle.tsx`, variante `.dark` en `globals.css:157`). Cambia el tema global, no solo la landing.
- La ciudad nocturna **no se genera con IA como imagen nueva**: no calzaría con la diurna y desalinearía los seis hotspots. Se deriva del mismo PNG con Sharp, garantizando geometría idéntica.
- Encima va una capa SVG de luces —ventanas, farolas, resplandor por manzana— que permite **encender cada manzana por separado**. La manzana bajo el cursor se ilumina más que las otras: la noche pasa a ser el sistema de navegación, no decorado.
- Segundo set de seis videos nocturnos, con iluminación real. Reemplazan la fuente del video sin tocar offsets ni hotspots.

## 11. Hallazgos anotados fuera de alcance

Detectados durante la auditoría. No se tocan en esta fase salvo instrucción.

1. `/chat` y `/como-funciona` **no están en `sitemap.ts`**. `/chat` es la página central del producto y no está declarada para buscadores. Corrección de una línea; pendiente de confirmación del usuario.
2. Hoy el dock manda a `/dashboard` haya o no sesión. Con `useSesion()` extraído se
   resuelve así, salvo instrucción en contra: sin sesión, `Mi cuenta` apunta a
   `/login?next=/dashboard` en vez de a `/dashboard`.

## 12. Criterios de aceptación

1. El scroll produce una transformación visible y comprensible: las hojas se abren y la ciudad se acerca.
2. No existe ningún punto del scroll con capas duplicadas de texto, ciudad o documentos.
3. El CTA a `/chat` funciona desde el primer frame, sin completar la secuencia.
4. Existe "Saltar la introducción" como primer elemento tabulable y funciona.
5. Ningún elemento invisible recibe foco de teclado.
6. Los seis videos aparecen registrados al pixel sobre la base, sin salto perceptible al entrar.
7. Ningún video se descarga antes del primer hover.
8. Con `prefers-reduced-motion` la página es completamente utilizable y no hay pin.
9. Todas las rutas de la tabla de la sección 6 son alcanzables.
10. No hay ningún enlace a `/corpus`, `/normativa` ni `/admin`.
11. El footer con descargo aparece en `/`.
12. No hay cifras normativas escritas a mano en el código de la landing.
13. Si `/api/stats` devuelve cero, el bloque de cobertura no se muestra.
14. Ninguna vista carga GSAP y Framer Motion a la vez.
15. `npm run build` pasa y no hay errores de consola propios de la landing.
16. `/` permanece intacta hasta la aprobación explícita del usuario.
