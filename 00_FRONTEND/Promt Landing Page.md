# LANDING PAGE REVISOR ARQ

## Especificacion canonica

### La ciudad es la interfaz

Crear una landing page narrativa, inmersiva y editorial para REVISOR ARQ, una plataforma de inteligencia normativa, urbanistica y territorial.

La experiencia ocurre dentro de una maqueta territorial construida en papel, carton y madera. La ciudad es el hilo conductor, el menu conceptual y el escenario donde se explica el producto. Puede cambiar de encuadre, acercarse o ceder espacio a una lamina editorial, pero debe permanecer reconocible durante toda la narrativa.

No diseñar un dashboard, una interfaz GIS, una aplicacion SaaS generica ni una ciudad futurista.

## Fuente visual canonica

La composicion oficial es `FONDO LANDING PAGE 5504x3072.png`.

La imagen existente manda sobre cualquier descripcion anterior. Se deben conservar:

- la geografia y la perspectiva;
- la plaza central;
- el predio vacio en primer plano;
- el edificio contemporaneo de celosias junto a la plaza;
- el edificio institucional con torre;
- los barrios, canales, bosques, topografia y ferrocarril;
- la paleta, la materialidad y la iluminacion general.

No se debe regenerar una ciudad distinta para corregir diferencias con prompts anteriores. Los derivados producidos con ComfyUI deben mantener la estructura de la imagen canonica.

## Proposito

Publico principal: arquitectos, desarrolladores, oficinas tecnicas y profesionales que necesitan comprender que se puede hacer en un terreno y por que.

Trabajo unico de la landing: llevar a la persona desde una pregunta territorial hasta una accion concreta dentro de REVISOR ARQ.

Pregunta central:

> ¿Se puede construir aqui?

Propuesta de valor:

> REVISOR ARQ conecta normativa, conocimiento tecnico y condiciones territoriales para entregar decisiones explicables, verificables y respaldadas por fuentes.

## Tesis visual

La maqueta no es decoracion. Cada elemento cumple una funcion:

- el predio vacio contiene la pregunta;
- la ciudad contiene las condiciones territoriales;
- la plaza conecta problema, conocimiento y respuesta;
- los edificios civicos representan fuentes y criterio;
- el edificio de celosias representa el Centro de Inteligencia y la respuesta;
- las capas impresas sobre el predio representan el analisis;
- la lamina editorial representa el fundamento y las fuentes.

## Direccion visual

La experiencia debe sentirse como una instalacion territorial de museo fotografiada profesionalmente.

Materiales visuales:

- carton prensado y kraft;
- papel de algodon y cartulina mate;
- papel vegetal;
- madera balsa color miel;
- tinta tecnica y grafito;
- pintura mate;
- bordes cortados, uniones, capas y pequeñas imperfecciones artesanales.

Evitar:

- estetica de videojuego;
- render inmobiliario;
- vidrio, plastico brillante o neon;
- particulas, hologramas o circuitos;
- iconos de inteligencia artificial;
- pins, flechas o marcadores GIS;
- documentos o libros flotantes;
- decoracion tecnologica sin funcion.

## Sistema visual web

### Color

- Papel claro: `#F3EBDD`
- Kraft: `#B98552`
- Tinta: `#26231F`
- Agua: `#2F7C80`
- Bosque: `#314D35`
- Terracota: `#B95F46`
- Madera iluminada: `#D4A568`

Los colores de interfaz deben derivarse de la maqueta. No introducir una paleta tecnologica separada.

### Tipografia

- Titulares editoriales: Instrument Serif.
- Texto de lectura y controles: Inter.
- Datos, fuentes, coordenadas y capas: JetBrains Mono.

La tipografia debe ser contenida. El hero no debe cubrir la ciudad con un parrafo largo.

### Elemento distintivo

La experiencia se recordara por el analisis material del predio vacio. Las condiciones aparecen como capas de tinta, papel vegetal y volumen recortado que respetan su perspectiva.

## Arquitectura narrativa

### 1. Apertura: territorio

Mostrar la escena completa a pantalla amplia. En conexiones lentas o con movimiento reducido se muestra directamente la imagen final. Cuando exista el activo correspondiente, puede comenzar con la lamina de plano tecnico y transicionar a la maqueta terminada.

Titulo:

> Antes de construir, hay que comprender.

Bajada:

> Conecta normativa, conocimiento y territorio para respaldar decisiones verificables.

Acciones:

- `Analizar este terreno` inicia la demostracion del predio.
- `Explorar la ciudad` activa la navegacion por hitos.

### 2. La pregunta

La camara o el encuadre se acerca al predio vacio. El resto de la ciudad permanece visible como contexto.

Mensaje:

> Un terreno no se explica con una sola norma.

El predio debe percibirse como oportunidad, no como abandono ni faena de construccion.

### 3. El analisis

La demostracion se organiza en tres actos, no en diez pantallas consecutivas:

1. Condiciones urbanisticas: limite, linea oficial, retiros, altura, ocupacion y constructibilidad.
2. Restricciones territoriales: riesgos, patrimonio, servidumbres y condiciones ambientales.
3. Fundamento verificable: criterio aplicado, explicacion y fuentes.

Las condiciones pueden revelarse individualmente dentro de cada acto, pero el usuario debe poder avanzar, retroceder u omitir la secuencia.

Las visualizaciones deben estar dibujadas en SVG y seguir la geometria visible del predio. No afirmar que la demostracion corresponde a datos normativos reales.

### 4. La respuesta

El foco vuelve al edificio contemporaneo de celosias, definido para la experiencia como Centro de Inteligencia REVISOR ARQ.

Mensaje:

> La respuesta aparece cuando territorio, criterio y fuentes se leen juntos.

Una lamina editorial entra desde el borde derecho con:

- condicion;
- aplicacion;
- fundamento;
- fuentes;
- accion `Consultar en REVISOR ARQ`.

La lamina no debe parecer un panel SaaS y no puede ocultar por completo la ciudad.

### 5. Exploracion libre

Hitos interactivos:

- Predio: `Analizar este terreno`.
- Centro de Inteligencia: `Consultar con REVISOR ARQ`.
- Edificio civico: `Normativa y fuentes`.
- Edificio cultural contemporaneo: `Conocimiento tecnico`.

Los nombres son una capa conceptual web. No es necesario alterar o rotular los edificios dentro de la imagen.

### 6. Cierre

La camara retorna a un encuadre donde predio, plaza y Centro de Inteligencia formen un conjunto legible.

Titulo:

> Comprende el territorio antes de decidir.

Texto:

> Accede a analisis normativos territoriales explicables, verificables y respaldados.

Acciones:

- `Entrar a REVISOR ARQ`.
- `Conocer la metodologia`.

## Interaccion

El hover es una mejora visual, nunca el unico medio de acceso.

Cada hito debe responder a:

- hover;
- foco de teclado;
- clic;
- toque en pantalla;
- navegacion mediante controles visibles.

Efectos permitidos:

- cambio leve de sombra;
- elevacion visual minima;
- iluminacion interior localizada;
- acercamiento lento de camara;
- aparicion de tinta o papel vegetal.

No usar rebotes, zoom agresivo, pulsos, resplandores ni animaciones permanentes.

## Texto y veracidad

La imagen debe comunicar la idea antes que el texto, pero el texto breve confirma el significado. No intentar explicar constructibilidad, fundamentos o fuentes exclusivamente mediante animacion.

La demostracion del predio es conceptual hasta que se conecte con datos reales del producto. Debe identificarse como ejemplo y no presentar cifras normativas inventadas.

## Responsive y accesibilidad

- Escritorio: escena amplia con texto integrado y lamina editorial lateral.
- Tablet: escena recortada conservando predio, plaza y Centro de Inteligencia.
- Movil: recortes o acercamientos secuenciales; no reducir toda la ciudad hasta volverla ilegible.
- Mantener foco visible y controles con etiquetas accesibles.
- Respetar `prefers-reduced-motion`.
- La narrativa completa debe funcionar sin video y sin hover.
- El texto esencial debe existir como HTML, no dentro de una imagen.

## Rendimiento

- No servir el PNG original de 31 MB directamente como recurso inicial.
- Generar AVIF o WebP responsive para cada encuadre.
- Precargar solo el hero.
- Cargar acercamientos y video bajo demanda.
- Priorizar una buena imagen estatica sobre un video inconsistente o pesado.

## Criterio de aceptacion

La landing es correcta cuando una persona puede entender, en este orden:

1. existe un terreno que necesita una respuesta;
2. la respuesta depende de varias condiciones;
3. REVISOR ARQ integra territorio, criterio y fuentes;
4. el resultado puede verificarse;
5. existe una accion clara para analizar un proyecto real.

La ciudad debe sentirse especifica de REVISOR ARQ y no intercambiable con otra landing de inteligencia artificial.
