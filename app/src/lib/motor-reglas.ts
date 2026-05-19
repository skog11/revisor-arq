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
