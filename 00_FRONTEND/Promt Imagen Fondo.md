# PROMPT COMFYUI: DERIVADOS DE LA CIUDAD CANONICA

## Objetivo

Este documento no solicita generar una ciudad nueva. La fuente visual obligatoria es `FONDO LANDING PAGE 5504x3072.png`.

Usar la imagen como referencia estructural fuerte mediante el flujo disponible en ComfyUI, priorizando conservacion de composicion, perspectiva y geografia por sobre creatividad. Los derivados se utilizaran como encuadres web de la misma maqueta.

## Reglas invariables

Preservar exactamente:

- posicion y forma del predio vacio;
- plaza central y pergolas;
- edificio contemporaneo de celosias;
- edificio institucional con torre;
- edificio cultural de volumen curvo;
- ferrocarril, estaciones y vias;
- canales, puentes y humedales;
- barrios, bosques y topografia;
- perspectiva aerea oblicua;
- materialidad de papel, carton y madera;
- direccion general de la luz;
- ritmo cromatico de cubiertas y fachadas.

No añadir, eliminar, trasladar ni rediseñar edificios o infraestructura. No intentar corregir la arquitectura presente en la imagen.

## Activos requeridos

### A. Hero web

Crear una version optimizada de la escena completa.

- Mantener el encuadre canonico 16:9.
- Ampliar lateralmente solo si el flujo de outpainting mantiene continuidad perfecta.
- Producir variantes para 2560, 1920, 1440 y 960 px de ancho.
- Mantener predio, plaza y edificio de celosias dentro de la zona segura.
- Conservar detalle local y evitar nitidez artificial.

### B. Acercamiento al predio

Crear un crop o derivado de alta resolucion centrado en el predio vacio, incluyendo sus cuatro calles, parte de la plaza y el edificio de celosias como contexto.

El predio debe permanecer vacio y mantenido. No agregar maquinaria, ruinas, excavaciones, cierres, construcciones, vegetacion nueva ni marcadores.

### C. Acercamiento al Centro de Inteligencia

Crear un crop o derivado centrado en el edificio de celosias y su relacion con la plaza y el predio.

Puede aumentar ligeramente la luz interior color ambar y la lectura de la madera, sin resplandor, spotlight ni estetica tecnologica.

### D. Variante de cierre

Crear una variante de luz de ultima hora o nocturna temprana conservando la misma ciudad.

- Iluminacion calida y localizada en edificios civicos.
- Agua y bosques aun legibles.
- Sin cielo visible.
- Sin neon, haces de luz ni ventanas exageradamente brillantes.

## Prompt positivo base

Use the supplied REVISOR ARQ city image as the strict canonical composition. Preserve the exact aerial oblique camera, city geography, vacant urban block, public square, timber lattice civic building, clock-tower institutional building, curved cultural building, rail infrastructure, waterways, bridges, neighborhoods, forests and layered topography.

This is the same handcrafted architectural paper city, photographed from the same physical model. Preserve pressed cardboard, kraft paper, cotton paper, matte cardstock, tracing paper, honey-colored balsa wood, technical ink, graphite, visible cut edges, layered contours, subtle joints and handcrafted imperfections.

Keep the image warm, crisp and materially rich. Preserve turquoise water, dark green forests, warm kraft terrain, mineral-colored houses, light gray paving and honey-colored timber architecture. Maintain natural studio shadows and realistic paper thickness.

Identity preservation and spatial continuity are more important than adding detail. Do not redesign, relocate, replace or invent any urban element.

## Prompt negativo

new city, changed geography, relocated buildings, redesigned architecture, missing clock tower, extra buildings, construction site, machinery, ruins, empty neighborhoods, changed railway, changed waterways, altered terrain, futuristic city, glossy plastic, CGI render, videogame, GIS overlay, dashboard, neon, hologram, glowing lines, labels, text, numbers, icons, pins, arrows, people at giant scale, excessive tilt shift, fog, sepia grading, washed out paper, monochromatic beige city, distorted streets, warped buildings, duplicate houses, inconsistent perspective

## Control de calidad

Descartar cualquier resultado que altere alguno de estos anclajes:

1. perimetro del predio;
2. relacion predio-plaza;
3. edificio de celosias;
4. torre institucional;
5. trazado ferroviario;
6. cursos de agua principales.

Si ComfyUI no mantiene esos anclajes, usar recortes directos de la imagen canonica y resolver el cambio de luz o enfoque en la web mediante capas CSS y SVG.
