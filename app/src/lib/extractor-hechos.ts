/**
 * extractor-hechos.ts — Extractor lightweight de hechos jurídicos relevantes.
 *
 * A partir del texto de la consulta, extrae hechos estructurados (sin LLM)
 * que permiten al motor-reglas disparar con mayor precisión y que el
 * sintetizador pueda usar para orientar su respuesta.
 *
 * Diseño: puro regex, O(n) en longitud de la pregunta, sin llamadas externas.
 * No reemplaza al clasificador.ts (que usa LLM): lo complementa con hechos
 * que el clasificador no extrae (estado de la obra, tipo de zona normativa, etc.).
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AccionSolicitada =
  | "acoger_conjunto_armonico"
  | "subdividir"
  | "lotear"
  | "ampliar"
  | "cambiar_destino"
  | "cambiar_uso_suelo"
  | "regularizar"
  | "modificar_permiso"
  | "desistir_permiso"
  | "obtener_recepcion"
  | "construir_nuevo"
  | "consultar_normativa"
  | "otro";

export type EstadoObra =
  | "con_recepcion"         // ya tiene recepción definitiva
  | "sin_recepcion"         // en construcción / permiso vigente, sin recepción
  | "con_permiso_vigente"   // permiso aprobado, sin iniciar o en obra
  | "sin_permiso"           // no tiene permiso aún
  | "irregular"             // obra sin permiso ya ejecutada (regularización)
  | "desconocido";

export type TipoZona =
  | "urbana"
  | "rural"
  | "rural_agricola"
  | "zona_tipica"
  | "borde_costero"
  | "zona_fronteriza"
  | "desconocida";

export interface HechosJuridicos {
  accion: AccionSolicitada;
  estado_obra: EstadoObra;
  zona: TipoZona;
  /** True si la consulta menciona explícitamente una norma o DDU específica */
  norma_mencionada: string | null;
  /** True si la consulta involucra una obra ya construida (ampliación sobre recepcionada) */
  sobre_obra_recepcionada: boolean;
  /** True si se pregunta sobre procedencia/factibilidad (no solo normativa general) */
  consulta_procedencia: boolean;
  /** Confianza en la extracción: alta = 2+ señales, media = 1, baja = 0 */
  confianza: "alta" | "media" | "baja";
}

// ─── Patrones de extracción ───────────────────────────────────────────────────

const PATRONES_ACCION: Array<[AccionSolicitada, RegExp]> = [
  ["acoger_conjunto_armonico", /acoger.{0,40}conjunto\s+arm[oó]nico|conjunto\s+arm[oó]nico.{0,40}acoger/i],
  ["subdividir",               /\bsubdivid[ir]+\b|\bsubdivisi[oó]n\b/i],
  ["lotear",                   /\blotear\b|\bloteo\b/i],
  ["ampliar",                  /\bampliar\b|\bampliaci[oó]n\b/i],
  ["cambiar_destino",          /\bcambio\s+de\s+destino\b|\bcambiar\s+(?:el\s+)?destino\b/i],
  ["cambiar_uso_suelo",        /\bcambio\s+de\s+uso\s+(?:de\s+)?suelo\b|\bcambiar\s+uso\s+(?:de\s+)?suelo\b/i],
  ["regularizar",              /\bregularizar\b|\bregularizaci[oó]n\b/i],
  ["modificar_permiso",        /\bmodificar.{0,30}permiso\b|\bmodificaci[oó]n.{0,30}permiso\b/i],
  ["desistir_permiso",         /\bdesistir.{0,30}permiso\b/i],
  ["obtener_recepcion",        /\bobtener.{0,30}recepci[oó]n\b|\bsolicitar.{0,30}recepci[oó]n\b/i],
  ["construir_nuevo",          /\bconstruir\b|\bnueva\s+construcci[oó]n\b|\bnuevo\s+edificio\b/i],
];

const PATRONES_ESTADO_OBRA: Array<[EstadoObra, RegExp]> = [
  ["con_recepcion",       /\brecepci[oó]n\s+definitiva\b|\bya\s+(?:tiene|cuenta\s+con)\s+recepci[oó]n\b|\bobra\s+recepcionada\b|\bcon\s+recepci[oó]n\b/i],
  ["irregular",           /\bsin\s+permiso\b|\birregular\b|\bno\s+cuenta\s+con\s+permiso\b|\bobra\s+irregular\b/i],
  ["sin_recepcion",       /\bsin\s+recepci[oó]n\b|\baún\s+no\s+(?:tiene|ha\s+obtenido)\s+recepci[oó]n\b/i],
  ["con_permiso_vigente", /\bcon\s+permiso\s+(?:de\s+edificaci[oó]n\s+)?(?:vigente|aprobado)\b|\btiene\s+permiso\b/i],
];

const PATRONES_ZONA: Array<[TipoZona, RegExp]> = [
  ["rural_agricola", /\bzona\s+rural\s+agr[ií]cola\b|\bsuelo\s+agr[ií]cola\b|\bagrícola\b.*\bzona\s+rural\b/i],
  ["rural",          /\bzona\s+rural\b|\bterreno\s+rural\b|\bfuera\s+del\s+l[ií]mite\s+urbano\b|\bsuelo\s+rural\b/i],
  ["zona_tipica",    /\bzona\s+t[íi]pica\b|\bzona\s+pintoresca\b/i],
  ["borde_costero",  /\bborde\s+costero\b|\bzona\s+costera\b/i],
  ["zona_fronteriza",/\bzona\s+fronteriza\b|\bcomplejo\s+fronterizo\b/i],
  ["urbana",         /\bzona\s+urbana\b|\bsuelo\s+urbano\b|\bdentro\s+del\s+l[ií]mite\s+urbano\b/i],
];

const PATRON_NORMA: RegExp =
  /\b(DDU\s*[-–]?\s*\d+|LGUC|OGUC|Art\.\s*\d+|DS[-–\s]?\d+|DFL[-–\s]?\d+|Ley\s+\d+[\.\d]*|Circular\s+DDU\s*\d+)/i;

const PATRON_PROCEDENCIA: RegExp =
  /\bpuedo\b|\bse\s+puede\b|\bes\s+posible\b|\bprocede\b|\bfactible\b|\bes\s+v[aá]lido\b|\bpermitido\b/i;

// ─── Extractor principal ──────────────────────────────────────────────────────

/**
 * Extrae hechos jurídicos de la consulta por análisis léxico (sin LLM).
 * Retorna siempre un objeto completo; los campos no detectados quedan
 * en su valor por defecto ("desconocido", false, null).
 */
export function extraerHechos(pregunta: string): HechosJuridicos {
  let senialesConfianza = 0;

  // ── Acción ───────────────────────────────────────────────────────────────
  let accion: AccionSolicitada = "consultar_normativa";
  for (const [tipo, patron] of PATRONES_ACCION) {
    if (patron.test(pregunta)) {
      accion = tipo;
      senialesConfianza++;
      break;
    }
  }
  if (accion === "consultar_normativa" && PATRON_PROCEDENCIA.test(pregunta)) {
    accion = "otro"; // pregunta de procedencia pero sin acción detectada
  }

  // ── Estado de la obra ─────────────────────────────────────────────────────
  let estado_obra: EstadoObra = "desconocido";
  for (const [tipo, patron] of PATRONES_ESTADO_OBRA) {
    if (patron.test(pregunta)) {
      estado_obra = tipo;
      senialesConfianza++;
      break;
    }
  }

  // ── Tipo de zona ──────────────────────────────────────────────────────────
  let zona: TipoZona = "desconocida";
  for (const [tipo, patron] of PATRONES_ZONA) {
    if (patron.test(pregunta)) {
      zona = tipo;
      senialesConfianza++;
      break;
    }
  }

  // ── Norma mencionada ──────────────────────────────────────────────────────
  const matchNorma = pregunta.match(PATRON_NORMA);
  const norma_mencionada = matchNorma ? matchNorma[1].trim() : null;
  if (norma_mencionada) senialesConfianza++;

  // ── Flags derivados ───────────────────────────────────────────────────────
  const sobre_obra_recepcionada =
    estado_obra === "con_recepcion" &&
    (accion === "ampliar" || accion === "acoger_conjunto_armonico" || accion === "modificar_permiso");

  const consulta_procedencia = PATRON_PROCEDENCIA.test(pregunta);

  // ── Confianza ─────────────────────────────────────────────────────────────
  const confianza: HechosJuridicos["confianza"] =
    senialesConfianza >= 2 ? "alta" : senialesConfianza === 1 ? "media" : "baja";

  return {
    accion,
    estado_obra,
    zona,
    norma_mencionada,
    sobre_obra_recepcionada,
    consulta_procedencia,
    confianza,
  };
}

/**
 * Formatea los hechos como bloque de contexto para el sintetizador.
 * Solo incluye hechos detectados (no "desconocido" / null) para no
 * saturar el prompt con información vacía.
 */
export function formatearHechos(hechos: HechosJuridicos): string {
  const lineas: string[] = [];

  if (hechos.accion !== "consultar_normativa" && hechos.accion !== "otro") {
    lineas.push(`- **Acción solicitada**: ${hechos.accion.replace(/_/g, " ")}`);
  }
  if (hechos.estado_obra !== "desconocido") {
    lineas.push(`- **Estado de la obra**: ${hechos.estado_obra.replace(/_/g, " ")}`);
  }
  if (hechos.zona !== "desconocida") {
    lineas.push(`- **Tipo de zona**: ${hechos.zona.replace(/_/g, " ")}`);
  }
  if (hechos.sobre_obra_recepcionada) {
    lineas.push(
      `- ⚠️ **Obra ya recepcionada**: la acción se realiza sobre una edificación con recepción definitiva — implica requisitos distintos al permiso original.`
    );
  }
  if (hechos.norma_mencionada) {
    lineas.push(`- **Norma referenciada en la consulta**: ${hechos.norma_mencionada}`);
  }

  if (lineas.length === 0) return "";

  return `\nCONTEXTO FÁCTICO DETECTADO EN LA CONSULTA (confianza: ${hechos.confianza}):
${lineas.join("\n")}
`;
}
