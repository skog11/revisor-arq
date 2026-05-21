/**
 * motor-reglas.ts — Compuerta normativa para casos de conflicto norma general/especial.
 *
 * Detecta combinaciones de términos en la consulta que activan una regla experta,
 * obligando al sistema a recuperar y considerar normas específicas antes de
 * responder. Este módulo previene errores donde el modelo responde según una
 * regla general (OGUC, LGUC) ignorando una norma especial restrictiva (DDU,
 * dictamen CGR) que cierra el caso.
 *
 * Ejemplo canónico: consulta "puedo acoger a conjunto armónico una obra con
 * recepción definitiva?" → debe disparar DDU 161 (improcedencia).
 *
 * Cada regla activa se inyecta al sintetizador como contexto adicional para
 * que el LLM no pueda concluir afirmativamente sin reconocer la restricción.
 */

export type EfectoRegla =
  | "bloquear_positiva"      // la conclusión no puede ser "sí procede"
  | "requerir_revision"      // marcar como caso ambiguo
  | "boost";                 // solo elevar prioridad de las normas indicadas

export interface ReglaGatillo {
  id: string;
  descripcion: string;
  cuando: {
    /** Frases o términos que deben aparecer en la consulta (lowercase, parcial OK) */
    co_ocurrencia: string[];
    /** Frases que excluyen la regla si aparecen (excepciones explícitas) */
    excepciones?: string[];
  };
  /** Claves de norma a forzar como chunks obligatorios. Formato: "DDU-161", "LGUC", etc. */
  forzar_normas: string[];
  efecto: EfectoRegla;
  /** Mensaje breve que se inyecta al prompt del LLM */
  mensaje_experto: string;
}

export interface ReglaActiva {
  regla: ReglaGatillo;
  terminosDetectados: string[];
}

/**
 * Catálogo inicial de reglas-gatillo curadas desde casos reales.
 * Cada regla nueva debe documentarse con su caso canónico en
 * app/docs/casos-canonicos/ (cuando exista).
 */
export const REGLAS_INICIALES: ReglaGatillo[] = [
  {
    id: "conjunto-armonico-recepcion",
    descripcion:
      "Improcedencia de acoger a conjunto armónico una obra con recepción definitiva (DDU 161 + Dictamen CGR 8518/2006).",
    cuando: {
      co_ocurrencia: ["conjunto armónico", "recepción"],
      excepciones: ["sin recepción", "no recepcionada", "previo a la recepción"],
    },
    forzar_normas: ["DDU-161"],
    efecto: "bloquear_positiva",
    mensaje_experto:
      "La DDU 161 (MINVU) establece la IMPROCEDENCIA de acoger a conjunto armónico una obra que ya cuenta con recepción definitiva. " +
      "El Dictamen CGR 8518/2006 refuerza que el conjunto armónico se aplica al proyecto como un todo y no a edificaciones individuales " +
      "ya recepcionadas. Por lo tanto, la respuesta NO puede afirmar procedencia salvo que el contexto contenga una excepción " +
      "explícita (p. ej. proyecto aún no recepcionado).",
  },
  {
    id: "loteo-rural-art55",
    descripcion:
      "Restricciones del Art. 55 LGUC: prohibición de subdividir o construir fuera de los límites urbanos sin autorización SEREMI MINVU y SAG.",
    cuando: {
      co_ocurrencia: ["zona rural", "subdivid"],
      excepciones: [],
    },
    forzar_normas: ["LGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "El Art. 55 de la LGUC restringe la subdivisión y edificación en zonas rurales: requiere autorización previa de SEREMI MINVU " +
      "y, en suelos de aptitud agrícola, informe favorable del SAG. La respuesta debe abordar estos requisitos antes de concluir " +
      "sobre procedencia.",
  },
  {
    id: "ddu-490-derogada",
    descripcion:
      "La DDU 490 fue dejada sin efecto por la DDU 519 (feb 2025) tras Dictamen CGR E14360/2025 sobre complejos fronterizos.",
    cuando: {
      co_ocurrencia: ["ddu 490"],
      excepciones: ["antes de la ddu 519", "histórica", "derogada"],
    },
    forzar_normas: ["DDU-519"],
    efecto: "requerir_revision",
    mensaje_experto:
      "La DDU 490 fue DEJADA SIN EFECTO por la DDU 519 del 06.02.2025. Si la consulta se refiere a la DDU 490 vigente, " +
      "debe advertirse explícitamente que el criterio fue revertido y que aplica la DDU 519 (complejos fronterizos como " +
      "infraestructura de transporte, excepción del Art. 116 LGUC).",
  },
  {
    id: "modificacion-obra-recepcionada",
    descripcion:
      "Modificaciones o ampliaciones a obras con recepción definitiva requieren un nuevo permiso de edificación, no una modificación del original.",
    cuando: {
      co_ocurrencia: ["ampliación", "recepción"],
      excepciones: ["sin recepción"],
    },
    forzar_normas: ["OGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Cuando una obra ya cuenta con recepción definitiva, una ampliación o modificación posterior NO puede tramitarse " +
      "como modificación del permiso original: requiere un nuevo permiso de edificación. La respuesta debe distinguir " +
      "claramente entre obras en construcción y obras ya recepcionadas.",
  },
  {
    id: "cambio-uso-suelo-rural",
    descripcion:
      "Cambio de uso de suelo rural a urbano: requiere modificación al instrumento de planificación territorial (IPT) y aprobación de CORE / GORE, no solo SEREMI.",
    cuando: {
      co_ocurrencia: ["cambio de uso", "rural"],
      excepciones: [],
    },
    forzar_normas: ["LGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "El cambio de uso de suelo rural a urbano implica modificar el Plan Regulador Comunal (PRC) o Intercomunal (PRI), " +
      "lo que requiere proceso formal de modificación del IPT con aprobación municipal y/o del CORE según corresponda. " +
      "La respuesta debe explicar este proceso y no sugerir trámite directo ante SEREMI MINVU como vía única.",
  },

  // ── Reglas adicionales — zona costera / borde costero ─────────────────────

  {
    id: "borde-costero-concesion",
    descripcion:
      "Construcciones y usos en el borde costero requieren concesión marítima de la Armada/DIRECTEMAR y no solo permiso municipal.",
    cuando: {
      co_ocurrencia: ["borde costero"],
      excepciones: ["dentro del predio", "alejado del borde"],
    },
    forzar_normas: ["LGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Las construcciones o usos sobre bienes nacionales de uso público en el borde costero (playa, ribera del mar) " +
      "requieren concesión marítima otorgada por la Armada de Chile (DIRECTEMAR), además del permiso de edificación. " +
      "El plan regulador comunal puede fijar restricciones adicionales en la franja costera. " +
      "La respuesta no debe limitarse al permiso municipal.",
  },

  // ── Reglas — monumentos nacionales y zonas típicas ──────────────────────────

  {
    id: "zona-tipica-intervencion",
    descripcion:
      "Cualquier intervención en inmuebles dentro de una Zona Típica o Pintoresca requiere autorización del CMN (Ley 17.288), adicional al permiso DOM.",
    cuando: {
      co_ocurrencia: ["zona típica"],
      excepciones: [],
    },
    forzar_normas: ["LEY-17288"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Las obras en inmuebles ubicados en Zonas Típicas o Pintorescas declaradas por el CMN (Art. 29 y 30, Ley 17.288) " +
      "requieren autorización previa del Consejo de Monumentos Nacionales, además del permiso de edificación de la DOM. " +
      "La respuesta debe mencionar ambos trámites y no presentar solo el permiso DOM como suficiente.",
  },

  {
    id: "monumento-historico-intervencion",
    descripcion:
      "Intervenciones en Monumentos Históricos (Ley 17.288): requieren autorización CMN y estudio de valor patrimonial.",
    cuando: {
      co_ocurrencia: ["monumento histórico"],
      excepciones: [],
    },
    forzar_normas: ["LEY-17288"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Los Monumentos Históricos están protegidos por la Ley 17.288. Cualquier obra de conservación, restauración, " +
      "modificación o demolición parcial requiere autorización expresa del Consejo de Monumentos Nacionales (CMN). " +
      "Sin esta autorización, la DOM no puede otorgar permiso de edificación.",
  },

  // ── Reglas — impacto ambiental ──────────────────────────────────────────────

  {
    id: "eia-seia-obligatorio",
    descripcion:
      "Proyectos que superan los umbrales del Art. 10 Ley 19.300 deben ingresar al SEIA antes del permiso de edificación.",
    cuando: {
      co_ocurrencia: ["impacto ambiental", "permiso"],
      excepciones: ["ya tiene rca", "con rca", "rca aprobada"],
    },
    forzar_normas: ["LEY-19300"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Conforme a la Ley 19.300 (Art. 10) y el DS 40/2012 (RSEIA), los proyectos que por su naturaleza o envergadura " +
      "figuren en el listado del Art. 10 deben obtener la Resolución de Calificación Ambiental (RCA) del SEA " +
      "ANTES de iniciar construcción. Sin RCA, la DOM no puede otorgar permiso de edificación (Art. 116 bis LGUC). " +
      "La respuesta debe verificar si el proyecto está en algún tipo del Art. 10.",
  },

  // ── Reglas — regularización ─────────────────────────────────────────────────

  {
    id: "regularizacion-sin-planos",
    descripcion:
      "La regularización de obras antiguas sin permiso requiere levantamiento topográfico y planos de arquitectura firmados por arquitecto, no solo declaración del propietario.",
    cuando: {
      co_ocurrencia: ["regularizar", "sin permiso"],
      excepciones: [],
    },
    forzar_normas: ["OGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "La regularización de obras ejecutadas sin permiso de edificación (Art. 167 y siguientes, OGUC) requiere " +
      "proyecto de arquitectura firmado por arquitecto habilitado, memoria de cálculo estructural (si aplica), " +
      "y cumplimiento de las normas vigentes a la fecha de la regularización o a la de construcción (Art. 167 OGUC). " +
      "La simple declaración del propietario no es suficiente.",
  },

  // ── Reglas — servidumbres y propiedades adyacentes ──────────────────────────

  {
    id: "servidumbre-medianero",
    descripcion:
      "La construcción en el deslinde de un predio activa normas de medianería y distancias mínimas de la OGUC.",
    cuando: {
      co_ocurrencia: ["medianero", "deslinde"],
      excepciones: [],
    },
    forzar_normas: ["OGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "La construcción en o junto al deslinde con predios vecinos activa las normas de medianería del Código Civil " +
      "y las distancias y rasantes de la OGUC (Art. 2.6.1 y siguientes). Deben verificarse los derechos del vecino " +
      "y las exigencias del plan regulador respecto a adosamientos permitidos.",
  },

  // ── Reglas — obras en inmuebles arrendados / copropiedad ───────────────────

  {
    id: "obras-en-copropiedad",
    descripcion:
      "Obras en bienes comunes de condominios (Ley 21.442) requieren acuerdo de asamblea, no solo decisión del administrador.",
    cuando: {
      co_ocurrencia: ["condominio", "obra"],
      excepciones: ["bien exclusivo", "propiedad exclusiva"],
    },
    forzar_normas: ["LEY-21442"],
    efecto: "requerir_revision",
    mensaje_experto:
      "La Ley 21.442 (Copropiedad Inmobiliaria) establece que las obras que afecten bienes comunes de un condominio " +
      "requieren acuerdo de la asamblea de copropietarios (con quórum según el tipo de obra). " +
      "El administrador por sí solo no tiene atribuciones para autorizar obras en bienes comunes. " +
      "La respuesta debe distinguir entre bienes exclusivos y bienes comunes.",
  },

  // ── Reglas — obras en suelo con restricciones especiales ───────────────────

  {
    id: "zona-inundacion-caudalosa",
    descripcion:
      "Proyectos en zonas de riesgo de inundación o en riberas de ríos requieren informe de la DGA y cumplimiento de la Política de Riberas.",
    cuando: {
      co_ocurrencia: ["inundación", "permiso"],
      excepciones: [],
    },
    forzar_normas: ["LGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Las zonas de riesgo de inundación están reguladas tanto por el PRC como por la DGA (Dirección General de Aguas). " +
      "Los proyectos en estas zonas pueden requerir informe de la DGA sobre cotas de inundación. " +
      "El Art. 60 LGUC permite a los planes reguladores limitar o prohibir construcciones en estas áreas. " +
      "La respuesta debe señalar la verificación de la zonificación del PRC y la consulta a la DGA.",
  },

  {
    id: "area-verde-publica",
    descripcion:
      "Las áreas verdes públicas no pueden ser edificadas salvo por excepción legal expresa; el propietario no puede construir sobre ellas.",
    cuando: {
      co_ocurrencia: ["área verde", "construir"],
      excepciones: ["ceñido a la norma", "infraestructura permitida"],
    },
    forzar_normas: ["LGUC"],
    efecto: "bloquear_positiva",
    mensaje_experto:
      "Las áreas verdes de uso público (parques, plazas, pasajes peatonales) son bienes nacionales de uso público " +
      "y no pueden ser objeto de permisos de edificación privados. Su modificación solo es posible mediante " +
      "modificación del instrumento de planificación territorial (IPT) con los quórum legales correspondientes. " +
      "La respuesta NO puede afirmar que es posible construir en área verde pública.",
  },

  // ── Regla: plaza pública / bien nacional de uso público ─────────────────────

  {
    id: "bien-nacional-uso-publico",
    descripcion:
      "Las plazas, playas y calles son bienes nacionales de uso público y no admiten permisos de edificación privados permanentes.",
    cuando: {
      co_ocurrencia: ["plaza", "instalar"],
      excepciones: ["contiguo a la plaza", "frente a la plaza"],
    },
    forzar_normas: ["LGUC"],
    efecto: "bloquear_positiva",
    mensaje_experto:
      "Las plazas y parques públicos son bienes nacionales de uso público (Art. 589 Código Civil; Art. 4 LGUC). " +
      "Ningún particular puede obtener permiso de edificación permanente sobre ellos. " +
      "Una autorización municipal de uso temporal (ferias, eventos) no habilita construcción permanente. " +
      "La respuesta NO puede concluir que la instalación permanente es posible.",
  },

  // ── Regla: permiso de demolición previo ────────────────────────────────────

  {
    id: "permiso-demolicion-previo",
    descripcion:
      "Antes de construir sobre un predio con edificaciones existentes se requiere permiso de demolición de la DOM, no basta el permiso de edificación nuevo.",
    cuando: {
      co_ocurrencia: ["demoler", "construir"],
      excepciones: ["ya demolido", "sitio eriazo", "terreno limpio"],
    },
    forzar_normas: ["OGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "La demolición de edificaciones existentes requiere un permiso de demolición independiente otorgado por la DOM (Art. 1.4.19 OGUC). " +
      "El permiso de edificación para la nueva construcción no incluye ni autoriza la demolición de lo existente. " +
      "La respuesta debe mencionar el permiso de demolición como trámite previo necesario.",
  },

  // ── Regla: certificado de informaciones previas ────────────────────────────

  {
    id: "cip-antes-del-permiso",
    descripcion:
      "El Certificado de Informaciones Previas (CIP) es el primer trámite antes de diseñar y solicitar permiso: informa sobre las normas urbanísticas del predio.",
    cuando: {
      co_ocurrencia: ["certificado de informaciones previas"],
      excepciones: [],
    },
    forzar_normas: ["LGUC", "OGUC"],
    efecto: "requerir_revision",
    mensaje_experto:
      "El Certificado de Informaciones Previas (CIP) es emitido por la DOM y certifica las normas urbanísticas aplicables al predio: " +
      "uso de suelo, coeficientes de constructibilidad y ocupación, altura, distanciamientos, rasante y sistema de agrupamiento. " +
      "Es el documento base para el diseño del proyecto. Sin CIP, el arquitecto diseña sin conocer las restricciones aplicables. " +
      "La respuesta debe situar el CIP como primer paso del proceso.",
  },

  // ── Regla: obras en faja de servidumbre eléctrica ─────────────────────────

  {
    id: "servidumbre-electrica",
    descripcion:
      "Las obras en la faja de servidumbre de tendidos eléctricos de alta tensión requieren autorización de la empresa concesionaria y de la SEC.",
    cuando: {
      co_ocurrencia: ["tendido eléctrico", "construir"],
      excepciones: [],
    },
    forzar_normas: ["DFL-4"],
    efecto: "requerir_revision",
    mensaje_experto:
      "Los tendidos de alta tensión establecen servidumbres de electroducto que impiden edificar en la faja de seguridad " +
      "definida en el DFL-4 (Ley Eléctrica). La empresa concesionaria y la SEC deben autorizar cualquier obra en esa franja. " +
      "La respuesta debe advertir sobre esta restricción y la necesidad de verificar la faja con la empresa distribuidora.",
  },
];

// ─── Lógica de aplicación ────────────────────────────────────────────────────

/**
 * Normaliza una cadena para matching: lowercase, sin tildes, sin signos de puntuación
 * comunes que puedan separar términos en la consulta del usuario.
 */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Evalúa qué reglas-gatillo activa la consulta dada.
 * Una regla se activa si TODOS los términos de `co_ocurrencia` aparecen en la
 * consulta y NINGUNA `excepción` aparece.
 */
export function aplicarReglas(
  pregunta: string,
  reglas: ReglaGatillo[] = REGLAS_INICIALES
): ReglaActiva[] {
  const preguntaNorm = normalizar(pregunta);
  const activas: ReglaActiva[] = [];

  for (const regla of reglas) {
    const terminos = regla.cuando.co_ocurrencia.map(normalizar);
    const todosPresentes = terminos.every((t) => preguntaNorm.includes(t));
    if (!todosPresentes) continue;

    const excepciones = (regla.cuando.excepciones ?? []).map(normalizar);
    const alguniaExcepcion = excepciones.some((e) => preguntaNorm.includes(e));
    if (alguniaExcepcion) continue;

    activas.push({
      regla,
      terminosDetectados: regla.cuando.co_ocurrencia,
    });
  }

  return activas;
}

/**
 * Formatea las reglas activas como bloque de prompt para inyectar al sintetizador.
 */
export function formatearReglasActivas(reglas: ReglaActiva[]): string {
  if (reglas.length === 0) return "";

  const bloques = reglas.map((ra, i) => {
    const efectoLabel =
      ra.regla.efecto === "bloquear_positiva"
        ? "⛔ BLOQUEAR CONCLUSIÓN POSITIVA"
        : ra.regla.efecto === "requerir_revision"
        ? "⚠️ REQUIERE ANÁLISIS DETALLADO"
        : "🔺 PRIORIDAD ELEVADA";

    return `[${i + 1}] ${efectoLabel}
Regla: ${ra.regla.descripcion}
Términos detectados en la consulta: ${ra.terminosDetectados.join(" + ")}
Normas obligatorias a considerar: ${ra.regla.forzar_normas.join(", ")}
${ra.regla.mensaje_experto}`;
  });

  return `
⚠️ COMPUERTA NORMATIVA ACTIVA — reglas expertas detectadas por co-ocurrencia de términos:

${bloques.join("\n\n")}

REGLA OBLIGATORIA: tu conclusión DEBE reflejar las restricciones señaladas arriba.
Si una regla declara "BLOQUEAR CONCLUSIÓN POSITIVA", no puedes responder "Sí, procede"
salvo que el contexto recuperado contenga una excepción explícita y literal que la habilite.
Si una regla "REQUIERE ANÁLISIS DETALLADO", debes abordar cada punto del mensaje experto
antes de concluir.
`;
}
