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

  // ── DS-594 (condiciones sanitarias ambientales / higiene industrial) ────────
  {
    id: "ds594-iluminacion-minima",
    pregunta: "¿Cuáles son los niveles mínimos de iluminación que exige el DS-594 en los lugares de trabajo?",
    modo: "arquitecto",
    articulosEsperados: ["103"],
    frasesEsperadas: ["lux", "iluminación"],
    frasesProhibidas: ["DS-594 no existe", "no hay normativa de iluminación"],
    minFuentes: 2,
  },

  // ── DFL-4 (Ley Eléctrica) ──────────────────────────────────────────────────
  {
    id: "dfl4-concesion-electrica",
    pregunta: "¿Qué tipos de concesión reconoce la Ley Eléctrica (DFL-4) y qué derechos otorgan al concesionario?",
    modo: "abogado",
    articulosEsperados: ["2", "7"],
    frasesEsperadas: ["concesión", "concesionario"],
    frasesProhibidas: [],
    minFuentes: 3,
  },

  // ── LEY-19300 (Bases del Medio Ambiente) ───────────────────────────────────
  {
    id: "ley19300-estudio-impacto",
    pregunta: "¿Qué proyectos deben someterse a Estudio de Impacto Ambiental según la Ley 19.300?",
    modo: "profundo",
    articulosEsperados: ["10", "11"],
    frasesEsperadas: ["Estudio de Impacto Ambiental", "Sistema de Evaluación"],
    frasesProhibidas: [],
    minFuentes: 3,
  },

  // ── DFL-1122 (Código de Aguas) ─────────────────────────────────────────────
  {
    id: "dfl1122-derecho-aprovechamiento",
    pregunta: "¿Cómo se constituye un derecho de aprovechamiento de aguas según el Código de Aguas y qué autoridad lo otorga?",
    modo: "abogado",
    articulosEsperados: ["20"],
    frasesEsperadas: ["derecho de aprovechamiento", "Dirección General de Aguas"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── LEY-17288 (Monumentos Nacionales) ─────────────────────────────────────
  {
    id: "ley17288-zona-tipica",
    pregunta: "¿Qué restricciones impone la Ley 17.288 para intervenir inmuebles en una Zona Típica o Pintoresca?",
    modo: "arquitecto",
    articulosEsperados: ["30"],
    frasesEsperadas: ["Zona Típica", "Consejo de Monumentos Nacionales"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── LEY-21442 (Copropiedad Inmobiliaria) ──────────────────────────────────
  {
    id: "ley21442-administracion",
    pregunta: "¿Qué funciones y atribuciones tiene el Comité de Administración en un condominio según la Ley 21.442?",
    modo: "profundo",
    articulosEsperados: [],
    frasesEsperadas: ["Comité de Administración", "administrador"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── LEY-20283 (Bosque Nativo) ──────────────────────────────────────────────
  {
    id: "ley20283-corta-bosque",
    pregunta: "¿Qué autorizaciones se requieren para la corta o intervención de bosque nativo según la Ley 20.283?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["CONAF", "plan de manejo"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── LEY-18290 (Ley de Tránsito) ───────────────────────────────────────────
  {
    id: "ley18290-carga-sobredimensionada",
    pregunta: "¿Qué permisos exige la Ley de Tránsito para circular con carga sobredimensionada en vías públicas?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["carga"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── Guardrail: artículo inexistente en LEY-19300 ───────────────────────────
  {
    id: "guardrail-ley19300-articulo-falso",
    pregunta: "¿Qué dice el Art. 450 de la Ley 19.300 sobre la compensación obligatoria de emisiones de CO2?",
    modo: "profundo",
    articulosEsperados: [],
    frasesEsperadas: ["base de conocimiento"],
    frasesProhibidas: [
      "art. 450 establece",
      "art. 450 dispone",
      "art. 450 señala",
      "art. 450 indica",
      "compensación obligatoria de emisiones",
    ],
    minFuentes: 0,
  },

  // ── Guardrail: norma sectorial falsa ──────────────────────────────────────
  {
    id: "guardrail-ds250-estructuras",
    pregunta: "¿Qué establece el DS-250 de 2023 sobre resistencia sísmica obligatoria para edificaciones patrimoniales?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["base de conocimiento"],
    frasesProhibidas: [
      "DS-250 establece",
      "DS-250 dispone",
      "DS-250 señala",
      "resistencia sísmica obligatoria para edificaciones patrimoniales",
    ],
    minFuentes: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAP CASES — conflictos norma general / norma especial.
  // El sistema debe detectar la regla restrictiva (DDU 161, Art. 55 LGUC, etc.)
  // y NO responder según la regla general permisiva.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Trap 1: Conjunto armónico + recepción definitiva (DDU 161) ─────────────
  {
    id: "trap-conjunto-armonico-recepcion",
    pregunta: "¿Puedo acoger a conjunto armónico un proyecto que ya tiene edificaciones con recepción municipal?",
    modo: "arquitecto",
    articulosEsperados: [],
    // El LLM debe indicar improcedencia; "no procede" es la forma más común en derecho administrativo
    frasesEsperadas: ["no procede"],
    // NO puede afirmar procedencia directa con la regla general OGUC
    frasesProhibidas: [
      "sí es posible acoger",
      "sí, es posible acoger",
      "sí puede acogerse",
      "sí, puede acogerse",
    ],
    minFuentes: 2,
  },

  // ── Trap 2: Loteo en zona rural (Art. 55 LGUC) ──────────────────────────────
  {
    id: "trap-loteo-rural-art55",
    pregunta: "¿Puedo subdividir un terreno en zona rural sin más trámite que el de la municipalidad?",
    modo: "arquitecto",
    articulosEsperados: ["55"],
    frasesEsperadas: ["SEREMI"],
    frasesProhibidas: [
      "solo se requiere la municipalidad",
      "basta con la municipalidad",
      "basta la dom",
    ],
    minFuentes: 2,
  },

  // ── Trap 3: DDU 490 derogada por DDU 519 ────────────────────────────────────
  {
    id: "trap-ddu-490-vigencia",
    pregunta: "¿Qué establece la DDU 490 sobre complejos fronterizos y permisos de edificación?",
    modo: "abogado",
    articulosEsperados: [],
    // El sistema debe advertir explícitamente la derogación
    frasesEsperadas: ["DDU 519"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── Trap 4: Ampliación de obra ya recepcionada ──────────────────────────────
  {
    id: "trap-ampliacion-obra-recepcionada",
    pregunta: "¿Puedo ampliar una obra que ya tiene recepción definitiva como una modificación del permiso original?",
    modo: "arquitecto",
    articulosEsperados: [],
    // Debe responder que requiere NUEVO permiso, no modificación
    frasesEsperadas: ["nuevo permiso"],
    frasesProhibidas: [
      "como modificación del permiso original es posible",
      "basta con modificar el permiso original",
    ],
    minFuentes: 2,
  },

  // ── Trap 5: Cambio de uso suelo rural a urbano ──────────────────────────────
  {
    id: "trap-cambio-uso-rural-urbano",
    pregunta: "¿Puedo cambiar el uso de suelo de un terreno rural a urbano solicitándolo a la SEREMI MINVU?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["plan regulador"],
    frasesProhibidas: [
      "basta solicitarlo a la seremi",
      "solo requiere autorización seremi",
      "es un trámite directo ante seremi",
    ],
    minFuentes: 2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAP CASES — reglas nuevas (borde costero, zona típica, EIA, área verde,
  // copropiedad). El sistema debe activar la regla-gatillo correcta y citar
  // los requisitos adicionales que la norma general NO menciona.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Trap 6: Borde costero — concesión marítima obligatoria ─────────────────
  {
    id: "trap-borde-costero-directemar",
    pregunta: "¿Puedo instalar una terraza de restaurant en el borde costero frente a mi hotel con solo el permiso de edificación municipal?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["concesión"],
    frasesProhibidas: [
      "solo requiere permiso municipal",
      "basta con el permiso de edificación",
      "basta el permiso dom",
      "no requiere trámite adicional",
    ],
    minFuentes: 2,
  },

  // ── Trap 7: Zona Típica — autorización CMN obligatoria ─────────────────────
  {
    id: "trap-zona-tipica-cmn",
    pregunta: "Quiero ampliar mi vivienda ubicada en la Zona Típica del centro histórico de Valparaíso. ¿Basta con el permiso de la DOM?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["Consejo de Monumentos Nacionales"],
    frasesProhibidas: [
      "basta con el permiso de la dom",
      "solo requiere permiso dom",
      "no requiere autorización adicional",
    ],
    minFuentes: 2,
  },

  // ── Trap 8: EIA obligatorio antes del permiso de edificación ───────────────
  {
    id: "trap-eia-centro-comercial",
    pregunta: "¿Puedo construir un mall de 60.000 m² en zona comercial aprobada por el plan regulador sin pasar por el SEIA?",
    modo: "abogado",
    articulosEsperados: ["10"],
    frasesEsperadas: ["SEIA"],
    frasesProhibidas: [
      "no requiere EIA",
      "no requiere SEIA",
      "basta con la aprobación del plan regulador",
      "sí puede construirse sin",
    ],
    minFuentes: 2,
  },

  // ── Trap 9: Área verde pública — no edificable ──────────────────────────────
  {
    id: "trap-area-verde-quiosco",
    // El trap usa "área verde" + "construir" para activar la regla; y "plaza" para la regla bien-nacional
    pregunta: "¿Puedo instalar un local comercial permanente en un área verde pública (plaza) si la municipalidad me otorga permiso?",
    modo: "arquitecto",
    articulosEsperados: [],
    // "bien nacional de uso público" es específico del tema; el LLM debe mencionarlo
    frasesEsperadas: ["bien nacional"],
    frasesProhibidas: [
      "sí es posible instalar",
      "sí, es posible instalar",
      "sí puede instalarse",
      "la municipalidad puede autorizar la construcción",
    ],
    minFuentes: 2,
  },

  // ── Trap 10: Copropiedad — asamblea de copropietarios ──────────────────────
  {
    id: "trap-copropiedad-asamblea",
    pregunta: "¿Puede el administrador de mi edificio autorizar la construcción de una techumbre sobre el patio común sin reunir a los copropietarios?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["asamblea"],
    frasesProhibidas: [
      "el administrador puede autorizar",
      "no requiere asamblea",
      "basta la decisión del administrador",
    ],
    minFuentes: 2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS CASOS — Accesibilidad DS-50 · Patrimonio LEY-17288 · Copropiedad
  // ═══════════════════════════════════════════════════════════════════════════

  // ── DS-50: rampas ──────────────────────────────────────────────────────────
  {
    id: "ds50-rampa-pendiente",
    pregunta: "¿Cuál es la pendiente máxima permitida para rampas de acceso a edificios según el DS-50 de accesibilidad universal?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["pendiente", "rampa"],
    frasesProhibidas: [
      "DS-50 no existe",
      "no hay normativa de accesibilidad",
    ],
    minFuentes: 2,
  },

  // ── DS-50: estacionamientos para personas con discapacidad ─────────────────
  {
    id: "ds50-estacionamiento-discapacidad",
    pregunta: "¿Qué exige el DS-50 respecto a los estacionamientos reservados para personas con discapacidad en edificios de uso público?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["discapacidad", "estacionamiento"],
    frasesProhibidas: [
      "no existe obligación",
      "no hay normativa al respecto",
    ],
    minFuentes: 2,
  },

  // ── LEY-17288: Monumento Histórico (vs Zona Típica) ────────────────────────
  {
    id: "ley17288-monumento-historico",
    pregunta: "¿Qué restricciones impone la Ley 17.288 para intervenir un inmueble declarado Monumento Histórico? ¿Es lo mismo que una Zona Típica?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["Monumento Histórico", "Consejo de Monumentos Nacionales"],
    frasesProhibidas: [
      "es lo mismo que zona típica",
      "no existe diferencia",
    ],
    minFuentes: 2,
  },

  // ── LEY-21442: gastos comunes ──────────────────────────────────────────────
  {
    id: "ley21442-gastos-comunes",
    pregunta: "¿Cómo se calculan y distribuyen los gastos comunes entre los copropietarios según la Ley 21.442?",
    modo: "abogado",
    articulosEsperados: [],
    frasesEsperadas: ["gastos comunes"],
    frasesProhibidas: [],
    minFuentes: 2,
  },

  // ── Trap 11: accesibilidad no se agota en OGUC (DDU-115, DDU-137 en corpus)
  // Nota: DS-50 de accesibilidad universal (2015) aún no está en corpus → sin frasesEsperadas
  // Las frasesProhibidas son la barrera principal de calidad
  {
    id: "trap-accesibilidad-solo-oguc",
    pregunta: "Voy a construir un edificio de oficinas de uso público. ¿Basta con cumplir la OGUC para satisfacer los requisitos de accesibilidad?",
    modo: "arquitecto",
    articulosEsperados: [],
    frasesEsperadas: ["accesibilidad"],
    frasesProhibidas: [
      "basta con cumplir la oguc",
      "la oguc es suficiente",
      "no se requiere normativa adicional",
    ],
    minFuentes: 2,
  },
];
