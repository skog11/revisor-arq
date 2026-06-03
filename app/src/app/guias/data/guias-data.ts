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
  {
    slug: "permiso-edificacion",
    titulo: "Permiso de Edificación: Requisitos y Flujo de Aprobación",
    descripcion:
      "Guía completa sobre la obtención del Permiso de Edificación (PE). Requisitos legales, documentación exigida, plazos administrativos y principales causas de rechazo.",
    tiempoLectura: "10 min",
    categoria: "Trámites y permisos",
    normasRelacionadas: [
      "LGUC Art. 116 — Anteproyectos, plazos y vigencia",
      "OGUC Art. 5.1.1 y ss. — Contenido del proyecto",
      "LGUC Art. 117 — Requisitos del permiso de edificación",
    ],
    contenido: [
      {
        titulo: "¿Qué es el Permiso de Edificación?",
        cuerpo: `<p>El <strong>Permiso de Edificación (PE)</strong> es la autorización que otorga la Dirección de Obras Municipales (DOM) para construir una obra conforme a un proyecto que cumpla con la normativa urbanística y técnica de la comuna.</p>
<p>Es un <strong>acto administrativo</strong> que certifica que el proyecto:</p>
<ul>
  <li>Respeta los parámetros urbanísticos del Plan Regulador Comunal (CC, CA, altura, rasante, distanciamientos).</li>
  <li>Cumple con la normativa técnica de la OGUC (cálculo de superficies, sistemas constructivos, etc.).</li>
  <li>No incumple normas especiales (zonas típicas, patrimonio, etc.).</li>
</ul>
<p>Sin PE no se puede iniciar construc­ción. La falta de PE o construcción sin PE es infracción según Art. 136 LGUC.</p>`,
      },
      {
        titulo: "Requisitos previos: Certificado de Informaciones Previas (CIP)",
        cuerpo: `<p>Antes de solicitar el PE, es <strong>obligatorio</strong> obtener el <strong>Certificado de Informaciones Previas (CIP)</strong> en la misma DOM.</p>
<p>El CIP contiene los parámetros urbanísticos específicos del terreno:</p>
<ul>
  <li>Coeficiente de constructibilidad (CC)</li>
  <li>Coeficiente de ocupación de suelo (CA o COS)</li>
  <li>Altura máxima permitida</li>
  <li>Ángulo de rasante</li>
  <li>Distanciamientos mínimos</li>
  <li>Usos de suelo permitidos</li>
  <li>Afectaciones a utilidad pública (franjas viales, servicios, etc.)</li>
</ul>
<p><strong>Plazo:</strong> la DOM debe entregar el CIP dentro de 7 días desde su solicitud (Art. 109 inc. 3 LGUC).</p>
<p><strong>Vigencia:</strong> la OGUC no fija un plazo de vencimiento explícito para el CIP, pero se recomienda renovarlo si el proyecto tarda más de 12 meses en diseño.</p>`,
      },
      {
        titulo: "Documentación requerida para solicitar PE",
        cuerpo: `<p>El proyecto debe incluir, como mínimo:</p>
<ol>
  <li>
    <strong>Memoria de cálculo</strong>: cuadro de superficies por piso, cálculo de CC y CA, cuadro de usos (habitacional, comercial, etc.).
  </li>
  <li>
    <strong>Planos de arquitectura</strong> en formato DWG o PDF:
    <ul>
      <li>Planimetría (plantas de cada piso)</li>
      <li>Cortes (mínimo 2 transversales)</li>
      <li>Elevaciones (4 fachadas)</li>
      <li>Planimetría de emplazamiento</li>
      <li>Matriz de superficies (por destino)</li>
    </ul>
  </li>
  <li>
    <strong>Especificaciones técnicas</strong>: sistemas constructivos, aislamientos, drenaje, estacionamientos, etc.
  </li>
  <li>
    <strong>Acta de aprobación de proyecto</strong> (si requiere) o poder de facultades para firmar.
  </li>
  <li>
    <strong>Certificado CIP</strong> original.
  </li>
  <li>
    <strong>Documentos del terreno</strong>: título de propiedad o contrato de promesa vigente, certificado de gravámenes, foto aérea reciente.
  </li>
  <li>
    <strong>Permisos previos</strong> (si aplican): resolución SEIA, permiso ambiental de la SEREMIa MINVU, etc.
  </li>
</ol>`,
      },
      {
        titulo: "Plazos de resolución",
        cuerpo: `<p>Según el Art. 117 LGUC, la DOM tiene <strong>60 días</strong> para resolver la solicitud de PE desde su presentación completa (plazo de silencio administrativo positivo).</p>
<p><strong>Si hay observaciones:</strong> la DOM notifica las observaciones <strong>antes del día 40</strong>, y el solicitante tiene <strong>30 días</strong> desde su notificación para subsanarlas o interponer recursos.</p>
<p><strong>Silencio administrativo positivo:</strong> si la DOM no responde en 60 días (sin observaciones pendientes), se entiende aprobado el PE.</p>
<p><strong>Renovación:</strong> el permiso debe ser tramitado nuevamente si el proyecto no comienza construcción en los plazos que fija la LGUC (Art. 116 inc. 8: máximo 4 años desde el anteproyecto aprobado, prorrogables a 6).</p>`,
      },
      {
        titulo: "Causas frecuentes de observación o rechazo",
        cuerpo: `<ol>
  <li><strong>Incumplimiento de parámetros urbanísticos:</strong> CC, CA, altura, rasante o distanciamientos fuera de norma según el CIP.</li>
  <li><strong>Superficies mal calculadas:</strong> incluir en el cuadro elementos que deben excluirse (estacionamientos subterráneos, ductos) o no descontar lo que corresponde.</li>
  <li><strong>Incumplimiento de usos de suelo:</strong> uso no permitido según el PRC (ej. comercial en zona residencial pura).</li>
  <li><strong>Falta de permisos previos:</strong> no adjuntar resolución SEIA, permiso ambiental, certificado de zona típica, etc.</li>
  <li><strong>Proyecto incompleto:</strong> faltan planos, cortes insuficientes, especificaciones vagas.</li>
  <li><strong>CIP vencido o renovación de proyecto:</strong> si el proyecto se modifica sustancialmente tras la aprobación del CIP.</li>
</ol>`,
      },
    ],
  },
  {
    slug: "lguc-vs-oguc",
    titulo: "LGUC vs OGUC: Jerarquía Normativa y Cuándo Aplica Cada Una",
    descripcion:
      "Explicación clara de la relación entre la Ley General de Urbanismo y Construcciones (LGUC) y la Ordenanza General de Urbanismo y Construcciones (OGUC). Casos de conflicto y cómo resolver ambigüedades normativas.",
    tiempoLectura: "8 min",
    categoria: "Marco normativo",
    normasRelacionadas: [
      "LGUC — Ley General de Urbanismo y Construcciones (DFL-458)",
      "OGUC — Ordenanza General de Urbanismo y Construcciones (DS-47)",
      "Art. 1 OGUC — Objeto y aplicación de la OGUC",
    ],
    contenido: [
      {
        titulo: "Estructura jerárquica",
        cuerpo: `<p>La normativa de urbanismo y construcción en Chile opera bajo una <strong>jerarquía clara:</strong></p>
<p><strong>1. LGUC (Ley General de Urbanismo y Construcciones, DFL-458/1975)</strong></p>
<ul>
  <li>Ley de rango superior (Decreto con Fuerza de Ley).</li>
  <li>Define <strong>principios generales</strong> y <strong>competencias de autoridades.</strong></li>
  <li>Ejemplo: "Art. 116 — Las DOM otorgarán permisos de edificación si el proyecto cumple con la OGUC".</li>
  <li>Es el marco; la LGUC casi nunca entra en detalles técnicos.</li>
</ul>
<p><strong>2. OGUC (Ordenanza General, DS-47/1992)</strong></p>
<ul>
  <li>Decreto Supremo que <strong>reglamenta la LGUC.</strong></li>
  <li>Contiene <strong>especificaciones técnicas detalladas:</strong> cálculos, medidas, requisitos de proyecto.</li>
  <li>Ejemplo: "Art. 5.1.11 — La superficie edificada se mide entre los ejes de los muros que delimitan los pisos".</li>
  <li>Es operativa; usada diariamente en la DOM.</li>
</ul>
<p><strong>3. DDUs (Decretos Dictaminados por la Unidad)</strong></p>
<ul>
  <li>Documentos técnicos del Ministerio de Vivienda que <strong>interpreta</strong> la LGUC/OGUC.</li>
  <li>No crean derechos u obligaciones nuevas, sino clarifican lo existente.</li>
  <li>Tienen peso consultivo ante la DOM y la SEREMI MINVU.</li>
</ul>
<p><strong>Orden de aplicación (jerarquía):</strong> LGUC → OGUC → DDUs → Jurisprudencia CGR → Doctrina.</p>`,
      },
      {
        titulo: "Relación LGUC-OGUC: Lo que dice la ley",
        cuerpo: `<p>El Art. 3 de la OGUC establece explícitamente: <em>"La presente Ordenanza General complementa la Ley General de Urbanismo y Construcciones".</em></p>
<p>Esto significa:</p>
<ul>
  <li><strong>La OGUC no puede contradecir la LGUC.</strong> Si hay conflicto, prevalece la LGUC.</li>
  <li><strong>La OGUC desarrolla lo que la LGUC deja abierto.</strong> Rellena los espacios técnicos.</li>
  <li><strong>La LGUC establece límites políticos; la OGUC, límites técnicos.</strong></li>
</ul>
<p>Ejemplo de relación armónica:</p>
<ul>
  <li><strong>LGUC Art. 117:</strong> "La DOM aprobará el PE si el proyecto cumple la OGUC".</li>
  <li><strong>OGUC Art. 5.1.1:</strong> "Los proyectos incluirán planos, especificaciones y memoria de cálculo conforme a lo que la presente Ordenanza establece".</li>
</ul>`,
      },
      {
        titulo: "Casos de conflicto y cómo resolverlos",
        cuerpo: `<p><strong>Caso 1: La LGUC silencia un tema que la OGUC sí regula</strong></p>
<p>Ejemplo: rasante. La LGUC casi no menciona rasante; la OGUC Art. 2.6.1 la define en detalle.</p>
<p>Solución: <strong>aplicar la OGUC directamente.</strong> No hay conflicto, solo complemento.</p>
<p><strong>Caso 2: La LGUC dice algo general; la OGUC es más específica</strong></p>
<p>Ejemplo: LGUC Art. 1.1.2 define "coeficiente de constructibilidad" como concepto. OGUC Arts. 2.1.1-2.1.24 detalla qué superficies cuentan y cuáles no.</p>
<p>Solución: <strong>aplicar la OGUC</strong> como desarrollo reglamentario de la LGUC.</p>
<p><strong>Caso 3: Hay aparente contradicción</strong></p>
<p>Ejemplo hipotético: LGUC Art. X dice "altura máxima 20 m" y OGUC Art. 2.6.2 pareciera permitir más con rasante.</p>
<p>Solución: <strong>prevalece la LGUC.</strong> La contradicción real es rara porque la OGUC es decreto reglamentario. Si ocurre, recurrir a jurisprudencia CGR o SEREMI MINVU.</p>`,
      },
      {
        titulo: "Guía práctica: cuándo usar LGUC, cuándo OGUC",
        cuerpo: `<p><strong>Usa LGUC si:</strong></p>
<ul>
  <li>Necesitas conocer competencias de autoridades (DOM, SEREMI MINVU, CGR).</li>
  <li>Necesitas plazos y procedimientos administrativos (ej. "¿cuántos días tiene la DOM para responder?").</li>
  <li>Necesitas conceptos amplios (ej. "¿qué es un instrumento de planificación territorial?").</li>
  <li>Tienes un conflicto legal y necesitas la norma suprema.</li>
</ul>
<p><strong>Usa OGUC si:</strong></p>
<ul>
  <li>Necesitas medidas, ángulos, fórmulas (ej. "¿cómo se calcula el CC?").</li>
  <li>Necesitas especificaciones técnicas (ej. "¿qué sistemas de aislamiento se requieren?").</li>
  <li>Necesitas resolver problemas de proyecto (rasantes, distanciamientos, superficies).</li>
  <li>La DOM te pide fundamentación técnica de un proyecto.</li>
</ul>
<p><strong>En la práctica:</strong> todo analista urbano debe tener ambas en su escritorio (o en su navegador). La LGUC es la ley; la OGUC es cómo cumplirla.</p>`,
      },
    ],
  },
  {
    slug: "checklist-residencial",
    titulo: "Checklist de Requisitos para Proyectos Residenciales",
    descripcion:
      "Lista de verificación ordenada por etapas: antes de diseñar, durante proyecto, antes de entrega de planos. Incluye requisitos LGUC/OGUC, ambiental y municipal.",
    tiempoLectura: "9 min",
    categoria: "Procesos y verificación",
    normasRelacionadas: [
      "OGUC Art. 5.1.1 — Contenido mínimo de proyectos",
      "LGUC Art. 116-118 — Permisos y requisitos",
      "Ley 19.300 — Evaluación de Impacto Ambiental",
    ],
    contenido: [
      {
        titulo: "Fase previa: antes de diseñar",
        cuerpo: `<ul>
  <li>☐ <strong>Obtener CIP en la DOM.</strong> Incluye CC, CA, altura, rasante, distanciamientos, afectaciones, usos permitidos.</li>
  <li>☐ <strong>Verificar si hay SEIA obligatorio.</strong> Revisar Ley 19.300 y DDU 443 (DDU pertinencia SEIA). Proyectos > 8.000 m² o en áreas sensibles suelen requerir RCA.</li>
  <li>☐ <strong>Confirmar zona no tiene restricciones especiales:</strong> zona típica, patrimonio, protección ambiental, etc.</li>
  <li>☐ <strong>Solicitar al municipio si hay permisos previos de terceros:</strong> junta vecinal, servicios de agua/gas/electricidad, etc.</li>
  <li>☐ <strong>Revisar PPR o PRMS.</strong> El PRC comunal puede estar condicionado por instrumentos regionales o metropolitanos.</li>
  <li>☐ <strong>Consultar si el proyecto necesita informe de Servicio de Vivienda o SAG.</strong> (predios rústicos, cambio de uso rural).</li>
</ul>`,
      },
      {
        titulo: "Fase de diseño",
        cuerpo: `<ul>
  <li>☐ <strong>Cumplir parámetros:</strong> CC, CA, altura máxima, rasante, distanciamientos. Documentar cálculos en memoria.</li>
  <li>☐ <strong>Diseñar según OGUC Art. 5.1.1+:</strong> accesos, circulación, servicios higiénicos (ratio: 1 baño por cada 3 dormitorios mín., etc.).</li>
  <li>☐ <strong>Estacionamientos:</strong> cumplir norma municipal (usualmente 1 por cada 3 m² de edificación, varía por comuna).</li>
  <li>☐ <strong>Accesibilidad:</strong> rampas, ascensores, puertas, baños accesibles según DS-50 (Decreto Accesibilidad).</li>
  <li>☐ <strong>Cálculo de superficies:</strong> aplicar Art. 5.1.11 OGUC (entre ejes de muros) y excluir correctamente (estacionamientos, ductos, escaleras).</li>
  <li>☐ <strong>Especificaciones técnicas:</strong> sistemas de calefacción, aislamientos térmicos/acústicos, drenaje, disposición de residuos.</li>
  <li>☐ <strong>Conformidad SEIA si aplica:</strong> si SEIA es exigible, tramitarlo antes del PE. Adjuntar RCA en solicitud PE.</li>
  <li>☐ <strong>Resoluciones sanitarias:</strong> si hay comercio integrado, verificar permisos de salud pública.</li>
</ul>`,
      },
      {
        titulo: "Antes de entregar a DOM",
        cuerpo: `<ul>
  <li>☐ <strong>Planos completos:</strong> plantas, cortes (mín. 2), elevaciones (4 fachadas), emplazamiento, matriz de superficies.</li>
  <li>☐ <strong>Formato correcto:</strong> DWG o PDF según requisitos comunales. Escala apropiada, cotas visibles, norte claro.</li>
  <li>☐ <strong>Memoria de cálculo:</strong> cuadro de superficies por piso, cuadro de usos, cálculo de CC y CA, justificación de rasante si aplica.</li>
  <li>☐ <strong>Especificaciones técnicas:</strong> documento adjunto que describa sistemas constructivos, materiales, instalaciones.</li>
  <li>☐ <strong>Comprobante de CIP:</strong> certificado original (no fotocopia) dentro de su período de vigencia.</li>
  <li>☐ <strong>Documentación del terreno:</strong> título de propiedad vigente, certificado de gravámenes, poder de representación si aplica.</li>
  <li>☐ <strong>Resolución SEIA (si aplica):</strong> copia de RCA favorable o certificado de no pertinencia.</li>
  <li>☐ <strong>Permisos sectoriales (si aplica):</strong> autorizaciones ambiental (SEREMI RM), sanitaria, etc.</li>
  <li>☐ <strong>Acta de aprobación de proyecto:</strong> firmada por los responsables (propietario y proyectista).</li>
</ul>`,
      },
      {
        titulo: "Ante observaciones de la DOM",
        cuerpo: `<ul>
  <li>☐ <strong>Clasificar la observación:</strong> formal (subsanable) o técnica (requiere argumentación).</li>
  <li>☐ <strong>Preparar respuesta fundamentada:</strong> citar artículo exacto de LGUC/OGUC, reproducir texto literal, demostrar cumplimiento.</li>
  <li>☐ <strong>Si la observación es correcta:</strong> modificar el proyecto en lugar de litigar. Ganar tiempo.</li>
  <li>☐ <strong>Interponer reposición dentro de 30 días:</strong> escrito dirigido al Director de Obras, numeración clara de observaciones y respuestas.</li>
  <li>☐ <strong>Conservar tiempos y constancias:</strong> guardar copia de presentación (timbre DOM, número de ingreso) para controlar plazos.</li>
</ul>`,
      },
    ],
  },
  {
    slug: "cambio-uso-suelo",
    titulo: "Cambio de Uso de Suelo: Procedimientos y Limitaciones",
    descripcion:
      "Guía sobre cuándo se requiere autorización de cambio de uso, qué normas aplican, diferencia entre cambio 'de hecho' y autorizado, y trámites ante la DOM.",
    tiempoLectura: "7 min",
    categoria: "Marco normativo",
    normasRelacionadas: [
      "LGUC Art. 55 — Prohibiciones en terrenos rurales",
      "OGUC Art. 2.1.1 — Usos permitidos por zona",
      "LGUC Art. 60 — Cambio de destino en terrenos subdivididos",
    ],
    contenido: [
      {
        titulo: "¿Qué es un cambio de uso de suelo?",
        cuerpo: `<p>Un <strong>cambio de uso de suelo</strong> es la <strong>modificación del destino principal</strong> de un inmueble, pasando de un uso permitido a otro diferente según el Plan Regulador Comunal (PRC).</p>
<p>Ejemplos:</p>
<ul>
  <li>De vivienda (residencial) a comercio (uso de servicios).</li>
  <li>De comercio a industria.</li>
  <li>De uso rural a residencial.</li>
  <li>De vivienda a equipamiento (escuela, consultorio).</li>
</ul>
<p><strong>Importante:</strong> la coexistencia de usos en un mismo inmueble (ej. "casa con tienda abajo") <strong>no es necesariamente un "cambio" de uso</strong> si el PRC lo permite. Se llama "uso mixto" y es distinto a cambio de destino.</p>`,
      },
      {
        titulo: "¿Cuándo se requiere autorización de cambio?",
        cuerpo: `<p><strong>Caso 1: Terrenos en zona urbana</strong></p>
<p>El PRC define usos permitidos por zona (residencial pura, comercial, mixta, etc.). Un <strong>cambio de uso requiere permiso de la DOM</strong> si:</p>
<ul>
  <li>El nuevo uso <strong>no está permitido</strong> según el PRC (ej. comercio en zona residencial pura).</li>
  <li>El nuevo uso es <strong>permitido pero condicional</strong> (usualmente requiere PE con justificación adicional).</li>
  <li>El nuevo uso implica <strong>aumento de densidad, estacionamientos u otros parámetros</strong> no previstos.</li>
</ul>
<p>La DOM puede autorizar cambios mediante resolución especial si el proyecto cumple con requerimientos técnicos y no contradice el instrumento de planificación.</p>
<p><strong>Caso 2: Terrenos rurales (Art. 55 LGUC)</strong></p>
<p>La LGUC <strong>prohíbe expresamente</strong> cambio de destino o subdivisión de predios rurales <strong>sin autorización especial.</strong> Dichas autorizaciones son tramitadas por:</p>
<ul>
  <li><strong>SEREMI MINVU</strong> (para cambios de uso rural a urbano a través de modificación de PRC).</li>
  <li><strong>SAG (Servicio Agrícola y Ganadero)</strong> (para autorizaciones de cambio en predios rústicos que permanecen rurales).</li>
  <li><strong>Otras entidades</strong> según el destino específico (ej. CONAF para bosques).</li>
</ul>
<p>Sin estas autorizaciones, el cambio es <strong>administrativamente nulo</strong> (Art. 55 LGUC).</p>`,
      },
      {
        titulo: "Cambio de uso 'de hecho' vs. autorizado",
        cuerpo: `<p><strong>De hecho:</strong> cuando un inmueble cambia de uso sin permiso de la DOM. Ejemplo: una casa pasa a ser consultorio sin solicitar cambio. Esto es <strong>infracción urbanística</strong> y puede derivar en:</p>
<ul>
  <li>Multas municipales.</li>
  <li>Orden de restitución del uso anterior.</li>
  <li>Problemas al solicitar permisos posteriores (ampliación, venta, etc.).</li>
</ul>
<p><strong>Autorizado:</strong> cambio tramitado formalmente ante la DOM. La autorización se otorga mediante:</p>
<ul>
  <li>Resolución administrativa especial de la DOM.</li>
  <li>O integrado en un nuevo Permiso de Edificación si el cambio va acompañado de obra.</li>
</ul>
<p><strong>Recomendación:</strong> siempre formalizar cambios de uso antes de hacerlos efectivos, aunque sea administrativamente complejo.</p>`,
      },
      {
        titulo: "Trámite de cambio de uso urbano",
        cuerpo: `<p><strong>Si el nuevo uso está permitido en la zona:</strong></p>
<ol>
  <li>Solicitar a la DOM confirmación de que el nuevo uso es permitido en la zona según el PRC.</li>
  <li>Si se acompaña de obra, tramitar simultáneamente Permiso de Edificación (PE) que incluya la solicitación de cambio de uso.</li>
  <li>Si es solo cambio sin obra, la DOM puede otorgarlo mediante resolución simple (a veces sin necesidad de PE nuevo).</li>
</ol>
<p><strong>Si el nuevo uso no está permitido:</strong></p>
<ol>
  <li>Solicitar a la Municipalidad que evalúe si el cambio es posible mediante excepcionalidad o artículo 59 LGUC (cambios de destino con justificación).</li>
  <li>Esto requiere propuesta de cambio al PRC o resolución de excepción municipal.</li>
  <li>Plazo: indeterminado, depende de evaluación política municipal.</li>
</ol>`,
      },
      {
        titulo: "Cambio de uso en predios rústicos",
        cuerpo: `<p>Los predios subdivididos bajo <strong>DL 3.516</strong> (subdivisiones menores que el límite parcelario) <strong>no pueden cambiar de destino sin autorización expresa.</strong> El Dictamen CGR E422376/2023 lo confirma.</p>
<p><strong>Proceso (según Art. 55 LGUC):</strong></p>
<ol>
  <li>Solicitar informe favorable del organismo competente (SAG para cambios rurales; SEREMI MINVU para cambios a urbano).</li>
  <li>Si se requiere modificación del PRC, tramitar ante SEREMI MINVU.</li>
  <li>La DOM requiere estos informes previos antes de otorgar nuevos permisos.</li>
</ol>
<p><strong>Tiempos:</strong> meses a años, según la complejidad y la prioridad política regional.</p>`,
      },
    ],
  },
];

export function getGuiaBySlug(slug: string): GuiaData | undefined {
  return GUIAS_DATA.find((g) => g.slug === slug);
}

export const GUIAS_SLUGS = GUIAS_DATA.map((g) => g.slug);
