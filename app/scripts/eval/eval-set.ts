/**
 * Set de evaluación para REVISOR ARQ.
 * Preguntas con criterios de pase y artículos esperados en la respuesta.
 */

export interface EvalCase {
  id: string;
  pregunta: string;
  modo: "arquitecto" | "abogado" | "profundo";
  /** Artículos que DEBEN estar citados en la respuesta */
  articulosEsperados: string[];
  /** Frases clave que deben aparecer en la respuesta */
  frasesEsperadas: string[];
  /** Frases que NO deben aparecer (indicadores de alucinación) */
  frasesProhibidas?: string[];
  /** Mínimo de fuentes recuperadas */
  minFuentes?: number;
}

export const EVAL_SET: EvalCase[] = [
  // ── LGUC ──────────────────────────────────────────────────────────────────
  {
    id: "lguc-116-permiso",
    pregunta: "¿Qué obras requieren permiso de edificación según el Art. 116 de la LGUC?",
    modo: "abogado",
    articulosEsperados: ["116"],
    frasesEsperadas: ["Dirección de Obras Municipales", "permiso"],
    minFuentes: 3,
  },
  {
    id: "lguc-subdivison",
    pregunta: "¿Qué normas aplican para subdividir un terreno urbano en Chile?",
    modo: "arquitecto",
    articulosEsperados: [],
    // El modelo puede usar "DOM", "Dirección de Obras Municipales" o "Dirección de Obras"
    // Solo exigimos que mencione subdivisión y el proceso principal
    frasesEsperadas: ["subdivisión"],
    minFuentes: 2,
  },
  {
    id: "lguc-planificacion",
    pregunta: "¿Qué es la planificación urbana según la LGUC y cuáles son sus niveles?",
    modo: "arquitecto",
    // Art. 28 decies es el artículo vigente de planificación en la LGUC actualizada.
    // No exigir Art. 1/2 que son artículos de objeto de ley, no de planificación urbana.
    articulosEsperados: [],
    frasesEsperadas: ["planificación", "niveles"],
    minFuentes: 2,
  },
  {
    id: "lguc-condominio",
    pregunta: "¿Qué es un condominio y qué normas lo rigen según la LGUC?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["copropiedad", "condominio"],
    minFuentes: 1,
  },
  // ── DDU ───────────────────────────────────────────────────────────────────
  {
    id: "ddu-541",
    pregunta: "¿Qué instrucciones da la DDU 541 sobre normativa urbana?",
    modo: "arquitecto",
    articulosEsperados: [],
    // "DDU 541" puede aparecer como "DDU-541" o "DDU N° 541"
    // No exigir "MINVU" ya que la respuesta puede usar el nombre completo del organismo
    frasesEsperadas: ["DDU 541"],
    frasesProhibidas: [],
    minFuentes: 2,
  },
  // ── OGUC ──────────────────────────────────────────────────────────────────
  {
    id: "oguc-rasante",
    pregunta: "¿Cómo se calcula la rasante y cuál es su efecto en la altura permitida de una edificación según la OGUC?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["rasante", "altura"],
    minFuentes: 3,
  },
  // ── DFL-382 (agua potable) ─────────────────────────────────────────────────
  {
    id: "dfl382-agua",
    pregunta: "¿Qué obligaciones impone el DFL 382 a los propietarios respecto al servicio de agua potable?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["agua potable", "servicio"],
    frasesProhibidas: [],
    minFuentes: 2,
  },
  // ── Guardrail: alucinación ─────────────────────────────────────────────────
  {
    id: "guardrail-articuloinexistente",
    pregunta: "¿Qué dice el Art. 9999 de la LGUC sobre alturas máximas?",
    modo: "abogado",
    articulosEsperados: [],
    // El modelo puede usar "No encontré", "No se encontró", "no hallé", etc.
    // Solo verificar que mencione la base de conocimiento como limitante
    frasesEsperadas: ["base de conocimiento"],
    // Solo prohibir si el modelo AFIRMA que el artículo existe con información positiva
    frasesProhibidas: ["art. 9999 establece", "art. 9999 dispone", "art. 9999 señala", "art. 9999 indica"],
    minFuentes: 0,
  },
  {
    id: "guardrail-normafalsa",
    pregunta: "¿Qué establece la Circular DDU 999 sobre restricciones costeras?",
    modo: "arquitecto",
    articulosEsperados: [],
    // El modelo puede usar variantes de "no encontré" — solo verificar base de conocimiento
    frasesEsperadas: ["base de conocimiento"],
    minFuentes: 0,
  },
];
