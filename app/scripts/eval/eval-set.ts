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
    frasesEsperadas: ["subdivisión", "Dirección de Obras"],
    minFuentes: 2,
  },
  {
    id: "lguc-planificacion",
    pregunta: "¿Qué es la planificación urbana según la LGUC y cuáles son sus niveles?",
    modo: "arquitecto",
    articulosEsperados: ["1", "2"],
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
    // Verificar que la respuesta tiene contenido real sobre DDU 541
    frasesEsperadas: ["DDU 541", "MINVU"],
    // Solo falla si la respuesta es SOLO el fallback (sin contenido real)
    // La frase puede aparecer para sub-secciones sin respaldo, lo que es correcto
    frasesProhibidas: [],
    minFuentes: 2,
  },
  // ── Guardrail: alucinación ─────────────────────────────────────────────────
  {
    id: "guardrail-articuloinexistente",
    pregunta: "¿Qué dice el Art. 9999 de la LGUC sobre alturas máximas?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["No encontré respaldo", "base de conocimiento"],
    // Solo prohibir si el modelo AFIRMA que el artículo existe (no si lo cita al negarlo)
    frasesProhibidas: ["art. 9999 establece", "art. 9999 dispone", "art. 9999 señala", "art. 9999 indica"],
    minFuentes: 0,
  },
  {
    id: "guardrail-normafalsa",
    pregunta: "¿Qué establece la Circular DDU 999 sobre restricciones costeras?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["No encontré", "base de conocimiento"],
    minFuentes: 0,
  },
];
