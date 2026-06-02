export interface GuiaSeccion {
  titulo: string;
  cuerpo: string; // HTML string
}

export interface GuiaData {
  slug: string;
  titulo: string;
  descripcion: string;
  tiempoLectura: string;
  categoria: string;
  normasRelacionadas: string[];
  contenido: GuiaSeccion[];
}

export const GUIAS_DATA: GuiaData[] = [
  {
    slug: "calculo-constructibilidad",
    titulo: "Cómo calcular el Coeficiente de Constructibilidad",
    descripcion:
      "Guía paso a paso según el Art. 1.1.2 de la OGUC. Qué áreas se descuentan, cómo justificarlo ante la DOM y errores frecuentes.",
    tiempoLectura: "6 min",
    categoria: "Parámetros urbanísticos",
    normasRelacionadas: [
      "OGUC Art. 1.1.2 — Definición coeficiente de constructibilidad",
      "OGUC Art. 2.1.24 — Superficies exentas del cómputo",
      "OGUC Art. 5.1.11 — Cálculo de superficie edificada",
    ],
    contenido: [
      {
        titulo: "¿Qué es el coeficiente de constructibilidad?",
        cuerpo: `<p>El <strong>coeficiente de constructibilidad (CC)</strong> es el factor que, multiplicado por la superficie del terreno, entrega la máxima superficie edificada permitida en ese predio según el Plan Regulador Comunal (PRC).</p>
<p>Ejemplo directo: si su terreno mide <strong>500 m²</strong> y el PRC asigna un CC de <strong>2,0</strong>, la superficie total edificada que puede construir es de <strong>1.000 m² máximo</strong>.</p>
<p>La definición legal está en el Art. 1.1.2 de la OGUC: <em>"Factor que multiplicado por la superficie del predio, fija la superficie máxima edificable."</em> El CC no limita la altura directamente — eso lo hace la rasante y la altura máxima de la zona — pero en la práctica ambas restricciones actúan en conjunto.</p>`,
      },
      {
        titulo: "Cómo se calcula la superficie edificada",
        cuerpo: `<p>Según el Art. 5.1.11 de la OGUC, la superficie edificada es la <strong>suma de todas las superficies de pisos</strong>, medidas entre los ejes de los muros que las limitan.</p>
<p><strong>Se incluye en el cómputo:</strong></p>
<ul>
  <li>Terrazas techadas con cierre (aunque sea parcial)</li>
  <li>Balcones techados con más del 50% de su perímetro cerrado</li>
  <li>Subterráneos destinados a usos distintos de estacionamiento y bodega</li>
  <li>Mezzanines y entrepiso</li>
</ul>
<p><strong>Se excluye según Art. 2.1.24 (no cuenta para el CC):</strong></p>
<ul>
  <li>Estacionamientos en subterráneo</li>
  <li>Bodegas en subterráneo (hasta cierto porcentaje)</li>
  <li>Terrazas no techadas</li>
  <li>Ductos de ventilación e instalaciones</li>
  <li>Elementos de circulación vertical (escaleras y ascensores) en edificios de más de 3 pisos — solo el área sobre el primer piso</li>
</ul>
<p>Es crítico aplicar correctamente estas exclusiones: muchos proyectos son objetados en la DOM por incluir en el cuadro de superficies elementos que deben descontarse, o viceversa.</p>`,
      },
      {
        titulo: "El Certificado de Informaciones Previas (CIP)",
        cuerpo: `<p>Antes de diseñar cualquier proyecto, el primer paso es solicitar el <strong>Certificado de Informaciones Previas (CIP)</strong> en la Dirección de Obras Municipales (DOM) correspondiente.</p>
<p>El CIP contiene, para el predio específico:</p>
<ul>
  <li>Coeficiente de constructibilidad (CC)</li>
  <li>Coeficiente de ocupación de suelo (CA o COS)</li>
  <li>Altura máxima de edificación</li>
  <li>Distanciamientos y adosamientos permitidos</li>
  <li>Usos de suelo autorizados</li>
  <li>Afectaciones a utilidad pública (franjas viales, etc.)</li>
</ul>
<p>El CIP es el documento base sobre el cual se calcula la constructibilidad real disponible. No se puede presuponer que el CC es el mismo en todo el predio: si existe una <strong>afectación a utilidad pública</strong> (por ejemplo, una ensanche de vía), esa superficie afecta se descuenta del terreno antes de aplicar el CC.</p>
<p>Vigencia del CIP: actualmente no tiene plazo de vencimiento definido por la OGUC, pero se recomienda renovarlo si el diseño tarda más de 12 meses desde su emisión.</p>`,
      },
      {
        titulo: "Ejemplo práctico",
        cuerpo: `<p>Suponga un terreno esquina de <strong>600 m²</strong> en zona R2 con los siguientes parámetros según el CIP:</p>
<ul>
  <li>CC = 1,8</li>
  <li>Coeficiente de ocupación de suelo (CA) = 0,6</li>
  <li>Altura máxima = 4 pisos</li>
</ul>
<p><strong>Cálculo:</strong></p>
<ul>
  <li>Superficie máxima edificada total: 600 × 1,8 = <strong>1.080 m²</strong></li>
  <li>Superficie máxima en planta (huella): 600 × 0,6 = <strong>360 m²</strong></li>
  <li>Pisos teóricos: 1.080 ÷ 360 = 3 pisos de 360 m² cada uno (más un 4.º con menor superficie por rasante)</li>
</ul>
<p>En la práctica, la rasante puede reducir el volumen utilizable en los pisos superiores antes de que se agote el CC. Siempre modelar ambas restricciones simultáneamente.</p>`,
      },
      {
        titulo: "Errores frecuentes",
        cuerpo: `<p>Los errores más comunes en el cómputo del CC que derivan en observaciones de la DOM:</p>
<ol>
  <li><strong>No descontar las superficies exentas del Art. 2.1.24.</strong> Es frecuente olvidar excluir los estacionamientos subterráneos o los ductos. Incluirlos infla el cuadro de superficies y genera rechazo.</li>
  <li><strong>Confundir CC con CA (coeficiente de ocupación de suelo).</strong> El CC controla el volumen total; el CA controla la huella en planta. Ambos operan en forma independiente y ambos deben cumplirse.</li>
  <li><strong>No considerar que la rasante puede limitar la altura antes de agotar el CC.</strong> En terrenos angostos o con vecinos en altura, la rasante corta el proyecto antes de que se use toda la constructibilidad disponible.</li>
  <li><strong>No verificar la afectación a utilidad pública.</strong> Si existe franjas viales en el CIP, el terreno efectivo para el cálculo del CC es menor que la superficie inscrita en el Conservador.</li>
  <li><strong>Medir superficies desde la cara exterior del muro en lugar de los ejes.</strong> La OGUC establece explícitamente la medición entre ejes de muros.</li>
</ol>`,
      },
    ],
  },
  {
    slug: "rasantes-distanciamientos",
    titulo: "Rasantes y Distanciamientos: Casos de Borde",
    descripcion:
      "Aplicación de rasantes en terrenos con pendiente y medianeros irregulares. Casos de borde y estrategias para verificar el cumplimiento.",
    tiempoLectura: "7 min",
    categoria: "Parámetros urbanísticos",
    normasRelacionadas: [
      "OGUC Art. 2.6.1 — Definición y medición de la rasante",
      "OGUC Art. 2.6.2 — Altura máxima de edificación",
      "OGUC Art. 2.6.3 — Distanciamientos mínimos",
    ],
    contenido: [
      {
        titulo: "La rasante: concepto básico",
        cuerpo: `<p>La <strong>rasante</strong> es el control volumétrico que limita la altura de una edificación en relación con los predios vecinos y el espacio público. Se define como un <strong>plano inclinado a 70°</strong> medido desde el deslinde o la línea oficial de edificación hacia el interior del predio.</p>
<p>Toda construcción debe quedar "por debajo" — o en el límite — del plano definido por ese ángulo. Ninguna parte de la edificación (ni muros, ni aleros, ni elementos salientes) puede traspasar la rasante hacia el predio vecino.</p>
<p>El ángulo de 70° es estándar en la mayoría de las comunas, pero <strong>el PRC puede modificarlo</strong>. Siempre verificar en el CIP si la zona contempla ángulo diferente (algunas zonas admiten 80° o establecen condiciones especiales para terrenos en pendiente).</p>`,
      },
      {
        titulo: "Cómo medir la rasante",
        cuerpo: `<p>El punto de origen de la rasante es el <strong>nivel natural del terreno vecino en el deslinde</strong> — no el piso terminado del proyecto, ni el nivel de la vereda.</p>
<p>Procedimiento de verificación:</p>
<ol>
  <li>Identificar el nivel natural del terreno vecino exactamente en la línea del deslinde (cota del vecino, no del proyecto).</li>
  <li>Desde ese punto, trazar una línea a 70° hacia el interior del predio (hacia adentro y hacia arriba).</li>
  <li>Cualquier punto de la edificación que quede por encima de esa línea incumple la rasante.</li>
</ol>
<p><strong>Ilustración conceptual (corte esquemático):</strong></p>
<pre style="background:var(--paper-2);padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;border:1px solid var(--rule)">
Terreno vecino  |  Tu predio
                |     /
    Nivel       |    / ← Plano rasante (70°)
    deslinde ───┼───/
                |  /
                | /   ← Edificación permitida (bajo el plano)
</pre>
<p>En <strong>desniveles</strong>: si el vecino está más alto que su proyecto, la rasante se origina a mayor altura y usted tiene más volumen disponible. Si el vecino está más bajo, la rasante "recorta" su proyecto desde el nivel inferior del vecino — este es el caso de mayor restricción.</p>`,
      },
      {
        titulo: "Casos de borde: terrenos en pendiente",
        cuerpo: `<p>Los terrenos con pendiente pronunciada son los que generan más dificultades en la verificación de rasantes, porque el nivel del deslinde varía a lo largo de todo el medianero.</p>
<p><strong>Problema típico:</strong> en un terreno con pendiente del 20% y un medianero de 20 m de largo, el nivel del vecino en el extremo inferior del medianero puede ser 4 m más bajo que en el extremo superior. Eso significa que la rasante actúa con más restricción en la parte baja del lote.</p>
<p><strong>Estrategia de verificación:</strong></p>
<ol>
  <li>Dividir el medianero en tramos de 5 m como máximo.</li>
  <li>Para cada punto del medianero, tomar el nivel del vecino en ese punto.</li>
  <li>Verificar la rasante de forma independiente en cada tramo.</li>
  <li>El punto más crítico suele estar en el extremo donde el vecino tiene menor nivel.</li>
</ol>
<p><strong>Solución de diseño habitual:</strong> escalonar la edificación siguiendo la pendiente del terreno, de modo que cada volumen cumpla la rasante desde el tramo de deslinde que le corresponde. Los muros de contención entre plataformas no cuentan como altura de edificación si no tienen usos en su interior.</p>`,
      },
      {
        titulo: "Distanciamientos mínimos",
        cuerpo: `<p>El distanciamiento es la separación mínima que debe mantenerse entre un muro de la edificación y el deslinde del predio vecino. Su propósito es garantizar iluminación y ventilación, independientemente de la rasante.</p>
<p><strong>Regla general según Art. 2.6.3 OGUC</strong> (cuando el PRC no establece otra cosa ni permite adosamiento):</p>
<ul>
  <li>El distanciamiento mínimo es <strong>1/4 de la altura del muro</strong> que enfrenta ese deslinde.</li>
  <li>Con un mínimo absoluto de <strong>1,5 m</strong> para los primeros 3 m de altura del muro.</li>
</ul>
<p>Ejemplo: un muro de 8 m de altura requiere distanciamiento mínimo de 8 ÷ 4 = 2 m desde el deslinde.</p>
<p><strong>Importante:</strong> el PRC puede establecer distanciamientos mayores que el mínimo de la OGUC. Siempre verificar en el CIP si la zona tiene condiciones especiales de distanciamiento.</p>`,
      },
      {
        titulo: "Adosamiento permitido",
        cuerpo: `<p>Cuando el PRC permite adosamiento, los muros que se adosan al medianero no requieren distanciamiento. Esto es común en zonas con edificación continua (comercial o residencial en densidad alta).</p>
<p><strong>Condiciones del adosamiento:</strong></p>
<ul>
  <li>El muro adosado debe ser muro cortafuego o cumplir los requisitos de la OGUC para muros medianeros.</li>
  <li>Si ambos predios se adosan mutuamente, se puede prescindir del distanciamiento en ese deslinde.</li>
  <li>El adosamiento no exime de cumplir la rasante desde el deslinde.</li>
</ul>
<p><strong>Regla práctica ampliamente usada en la DOM:</strong> adosar hasta <strong>3 m de altura máximo</strong> como muro ciego sin aplicar rasante. Por sobre esa altura, la rasante se aplica desde el nivel del deslinde (no desde la cima del muro adosado). Verificar en el PRC de cada comuna si esta condición está establecida explícitamente.</p>
<p>En predios esquina, las rasantes se aplican tanto desde el deslinde del vecino como desde la línea oficial de la vía. La combinación de ambas puede ser muy restrictiva en lotes angostos.</p>`,
      },
    ],
  },
  {
    slug: "defensas-dom",
    titulo: "Cómo responder a observaciones de la DOM",
    descripcion:
      "Técnicas de redacción legal-administrativa para fundamentar recursos de reposición y apelaciones jerárquicas ante la DOM y la SEREMI MINVU.",
    tiempoLectura: "8 min",
    categoria: "Trámites y recursos",
    normasRelacionadas: [
      "LGUC Art. 118 — Recursos contra resoluciones de la DOM",
      "LGUC Art. 12 — Recurso de reposición ante el Director de Obras",
      "LGUC Art. 13 — Recurso jerárquico ante la SEREMI MINVU",
    ],
    contenido: [
      {
        titulo: "Tipos de observaciones DOM",
        cuerpo: `<p>Antes de redactar cualquier respuesta, es fundamental <strong>clasificar cada observación</strong> según su naturaleza, ya que cada tipo exige una estrategia distinta:</p>
<p><strong>1. Observaciones formales (subsanables)</strong>: documentos faltantes, firmas, numeración de planos, formato incorrecto. Se resuelven adjuntando lo que falta sin necesidad de argumentar la norma. Plazo: subsanar dentro de los 30 días hábiles siguientes a la notificación.</p>
<p><strong>2. Observaciones técnicas</strong>: la DOM considera que el proyecto no cumple un parámetro urbanístico (CC, rasante, distanciamiento, uso de suelo). Requieren argumentar técnicamente por qué el proyecto sí cumple, citando el artículo exacto de la OGUC o la DDU aplicable.</p>
<p><strong>3. Observaciones de fondo (requieren modificar el proyecto)</strong>: la DOM tiene razón en la observación y el proyecto efectivamente no cumple la norma. La estrategia correcta es aceptar la observación y modificar el diseño, no litigar.</p>
<p><strong>4. Rechazos formales</strong>: vencimiento de plazo, falta de requisito habilitante (permiso previo, certificado, etc.). Requieren acciones distintas a la mera argumentación normativa.</p>
<p>Identificar correctamente el tipo de observación ahorra tiempo y evita desgaste en recursos que no corresponden.</p>`,
      },
      {
        titulo: "Recurso de reposición ante la DOM",
        cuerpo: `<p>El <strong>recurso de reposición</strong> es el primer remedio ante una observación o rechazo de la DOM. Se interpone directamente ante el Director de Obras Municipal que dictó el acto.</p>
<p><strong>Plazo:</strong> <em>5 días hábiles</em> desde la notificación del acto impugnado (Art. 59 Ley N.º 19.880, supletoria en lo no regulado por la LGUC).</p>
<p><strong>Requisitos del escrito:</strong></p>
<ul>
  <li>Dirigido al Director de Obras Municipales por nombre y cargo.</li>
  <li>Individualización completa del recurrente (nombre, RUT, domicilio, calidad en que actúa).</li>
  <li>Identificación precisa del acto que se impugna (número de oficio, fecha, número de expediente).</li>
  <li>Por cada observación: cita textual de la observación DOM → respuesta técnica con el artículo exacto citado literalmente → argumentación.</li>
  <li>Petición concreta: "Solicito se deje sin efecto la observación N.º X y se proceda a la aprobación del proyecto".</li>
</ul>
<p><strong>Tono:</strong> técnico-legal, sin argumentos de equidad ni comparaciones con proyectos vecinos. La DOM solo puede resolver en Derecho.</p>`,
      },
      {
        titulo: "Recurso jerárquico ante la SEREMI MINVU",
        cuerpo: `<p>Si la DOM no acoge la reposición — o no responde en el plazo legal — procede el <strong>recurso jerárquico ante la SEREMI MINVU</strong> de la región correspondiente.</p>
<p><strong>Plazo:</strong> <em>5 días hábiles</em> desde la notificación del rechazo de la reposición (o desde que venció el plazo de respuesta de la DOM sin que hubiere resolución).</p>
<p><strong>La SEREMI tiene 30 días hábiles para resolver.</strong> Si no resuelve en ese plazo, se entiende rechazado el recurso (silencio negativo), pudiendo pasar a la vía judicial.</p>
<p><strong>Documentación que debe adjuntarse:</strong></p>
<ol>
  <li>Copia del expediente completo del proyecto (planos, memorias, cuadros).</li>
  <li>Copia de la observación o rechazo de la DOM.</li>
  <li>Copia del recurso de reposición interpuesto y su respuesta (o constancia de falta de respuesta).</li>
  <li>Nueva argumentación técnico-legal, que puede incluir antecedentes adicionales no presentados en la reposición.</li>
</ol>
<p>El recurso jerárquico es el paso previo obligatorio antes de la vía judicial (Juzgado de Letras o Tribunal Contencioso-Administrativo, según corresponda).</p>`,
      },
      {
        titulo: "Estructura del escrito de defensa",
        cuerpo: `<p>El formato recomendado para cualquier escrito de impugnación ante la DOM o la SEREMI es el siguiente:</p>
<ol>
  <li>
    <strong>Individualización del recurrente</strong><br/>
    Nombre completo, RUT, domicilio, calidad jurídica (propietario, arquitecto patrocinante, abogado representante).
  </li>
  <li>
    <strong>Antecedentes del proyecto</strong><br/>
    Dirección del inmueble, rol de avalúo, número de expediente DOM, descripción breve del proyecto (destino, superficie, número de pisos).
  </li>
  <li>
    <strong>Observaciones de la DOM (cita textual)</strong><br/>
    Reproducir cada observación en sus términos exactos, numeradas correlativamente.
  </li>
  <li>
    <strong>Fundamentos de la impugnación</strong><br/>
    Por cada observación: (a) la norma aplicable con número de artículo exacto, (b) texto literal del artículo, (c) cómo el proyecto cumple esa norma. Si existe un Dictamen CGR relevante, citarlo aquí.
  </li>
  <li>
    <strong>Petición concreta</strong><br/>
    Solicitud específica, sin ambigüedades: "Que se deje sin efecto la observación N.º [X] y se apruebe el permiso de edificación solicitado".
  </li>
</ol>
<p>Numeración clara: cada observación DOM y cada fundamento de respuesta deben tener el mismo número para facilitar la lectura.</p>`,
      },
      {
        titulo: "Consejos prácticos",
        cuerpo: `<p>La experiencia en recursos ante DOMs y SEREMIs permite identificar los factores que determinan el éxito o fracaso de una defensa:</p>
<ul>
  <li><strong>Adjuntar siempre el Dictamen CGR relevante si existe.</strong> La Contraloría General de la República tiene atribuciones interpretativas vinculantes para las DOM. Un dictamen favorable a su tesis convierte el argumento en casi irrefutable.</li>
  <li><strong>Citar la norma con su número de artículo exacto.</strong> No basta con decir "según la OGUC". La DOM necesita verificar que usted cita el artículo correcto.</li>
  <li><strong>Usar el texto literal de la norma, no su paráfrasis.</strong> Copiar el texto oficial entre comillas y luego argumentar sobre él. Evitar interpretaciones libres no ancladas en el texto.</li>
  <li><strong>No argumentar con "interpretación" o "criterio".</strong> El escrito debe demostrar que el proyecto cumple la norma según su texto, no que usted tiene una interpretación más favorable.</li>
  <li><strong>Solicitar pronunciamiento expreso sobre cada observación.</strong> Si el escrito agrupa observaciones o es vago, la DOM puede responder de forma igualmente vaga. Cada observación debe tener su respuesta y su petición individualizadas.</li>
  <li><strong>Conservar constancia de entrega del escrito.</strong> Registrar la fecha de presentación (timbre de ingreso DOM o número de ingreso electrónico) para controlar los plazos de respuesta.</li>
  <li><strong>Si la observación es correcta, modificar el proyecto.</strong> Litigar una observación fundada solo demora el proyecto y genera costos innecesarios.</li>
</ul>`,
      },
    ],
  },
];

export function getGuiaBySlug(slug: string): GuiaData | undefined {
  return GUIAS_DATA.find((g) => g.slug === slug);
}

export const GUIAS_SLUGS = GUIAS_DATA.map((g) => g.slug);
