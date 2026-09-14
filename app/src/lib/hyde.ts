/**
 * hyde.ts - Hypothetical Document Embedding
 *
 * Antes de buscar en el corpus, genera un fragmento normativo hipotético
 * que respondería la consulta. Al embeber ese texto (que se parece a los
 * documentos reales del corpus), el vector de búsqueda queda más cerca
 * semánticamente de los chunks relevantes que la pregunta sola.
 *
 * Pipeline:
 *   1. Generar texto hipotético con Gemini Flash (~150 palabras)
 *   2. Embeber hipotético + query original por separado
 *   3. Promediar ambos vectores -> embedding combinado
 *   4. Usar ese embedding combinado en la búsqueda vectorial
 *
 * Falla silencioso: si la generación falla (timeout, cuota), retorna
 * el embedding de la query original sin modificar.
 */

import { generateWithFallback, MODEL_FLASH } from "./gemini";
import { embedText } from "./voyage";

// --- Vocabulario por dominio -------------------------------------------------
//
// OJO: hasta 2026-09 este prompt era exclusivamente urbanístico -- pedía
// redactar "como la LGUC, OGUC o DDU" usando términos como rasante, antejardín
// o coeficiente de constructibilidad. Eso significaba que, ante una consulta
// tributaria o ambiental, HyDE fabricaba un párrafo de urbanismo y el
// embedding promediado empujaba la búsqueda hacia el territorio DDU, que ya
// concentra el 44% del corpus. El texto hipotético debe imitar el lenguaje de
// la materia consultada, no el de la materia más frecuente en la base.
const VOCABULARIO_POR_DOMINIO: Record<string, { normas: string; terminos: string }> = {
  urbanismo: {
    normas: "LGUC, OGUC, Circulares DDU del MINVU e instrumentos de planificación territorial",
    terminos: "permiso de edificación, coeficiente de constructibilidad, ocupación de suelo, rasante, antejardín, uso de suelo, zonificación, subdivisión predial, DOM, SEREMI MINVU",
  },
  construccion: {
    normas: "OGUC, LGUC y Circulares DDU",
    terminos: "permiso de edificación, recepción definitiva, obra menor, regularización, carga de ocupación, resistencia al fuego, DOM",
  },
  tributario: {
    normas: "Ley N°17.235 sobre Impuesto Territorial, DL N°824 sobre Impuesto a la Renta, DL N°825 sobre IVA y DL N°3.475 sobre Impuesto de Timbres y Estampillas",
    terminos: "avalúo fiscal, reavalúo, impuesto territorial, contribuciones de bienes raíces, predio agrícola y no agrícola, tasación, mayor valor, enajenación de bienes raíces, habitualidad, Servicio de Impuestos Internos",
  },
  medioambiente: {
    normas: "Ley N°19.300 sobre Bases del Medio Ambiente, DS N°40/2012 y Ley N°20.283 sobre Bosque Nativo",
    terminos: "evaluación de impacto ambiental, declaración de impacto ambiental, resolución de calificación ambiental, SEA, plan de manejo, CONAF",
  },
  aguas: {
    normas: "Código de Aguas (DFL N°1.122/1981)",
    terminos: "derechos de aprovechamiento de aguas, cauce, álveo, ribera, DGA, zona de inundación",
  },
  salud: {
    normas: "Código Sanitario y sus decretos reglamentarios",
    terminos: "autorización sanitaria, SEREMI de Salud, residuos, aguas servidas, condiciones sanitarias",
  },
  patrimonio: {
    normas: "Ley N°17.288 sobre Monumentos Nacionales",
    terminos: "monumento nacional, zona típica, inmueble de conservación histórica, Consejo de Monumentos Nacionales",
  },
  vialidad: {
    normas: "DFL MOP N°850/1997 y la Ley de Caminos",
    terminos: "faja vial, derecho de vía, camino público, Dirección de Vialidad, MOP",
  },
  electricidad: {
    normas: "DFL N°4/2006 (Ley General de Servicios Eléctricos)",
    terminos: "concesión eléctrica, servidumbre, línea de alta tensión, SEC",
  },
  copropiedad: {
    normas: "Ley N°21.442 sobre Copropiedad Inmobiliaria",
    terminos: "condominio, bienes comunes, reglamento de copropiedad, asamblea de copropietarios",
  },
  accesibilidad: {
    normas: "DS N°50/2015 del MINVU y la Ley N°20.422",
    terminos: "ruta accesible, estacionamiento para personas con discapacidad, ancho libre de paso",
  },
  bienes_nacionales: {
    normas: "DL N°1.939/1977 y la Ley N°18.362",
    terminos: "bien nacional de uso público, bienes fiscales, concesión, borde costero",
  },
  defensa: {
    normas: "DFL N°221/1978 y la Ley N°16.752",
    terminos: "servidumbre aeronáutica, cono de aproximación, DGAC, zona de seguridad",
  },
  administrativo: {
    normas: "Ley N°19.880 sobre Bases de los Procedimientos Administrativos y dictámenes de la Contraloría General de la República",
    terminos: "silencio administrativo, recurso de reposición, plazo, competencia del órgano, invalidación",
  },
};

const GENERICO = {
  normas: "la legislación y reglamentación chilena aplicable a proyectos inmobiliarios",
  terminos: "terminología técnico-jurídica chilena precisa y propia de la materia consultada",
};

function construirSystem(dominios: string[]): string {
  const perfiles = dominios
    .map((d) => VOCABULARIO_POR_DOMINIO[d])
    .filter((v): v is { normas: string; terminos: string } => Boolean(v));

  const normas = perfiles.length
    ? perfiles.map((p) => p.normas).join("; ")
    : GENERICO.normas;
  const terminos = perfiles.length
    ? perfiles.map((p) => p.terminos).join(", ")
    : GENERICO.terminos;

  return `Eres un redactor experto en normativa chilena aplicable a proyectos inmobiliarios.
Tu tarea es generar un fragmento normativo hipotético de 100 a 150 palabras que respondería directamente a la consulta del usuario.

REGLAS:
- Escribe con el estilo formal y técnico de ${normas}.
- Usa terminología técnica real de la materia: ${terminos}.
- Ajusta el estilo a la materia de la consulta. Si la pregunta es tributaria, escribe como una ley tributaria; si es ambiental, como una ley ambiental. No fuerces vocabulario urbanístico en materias que no lo son.
- NO incluyas explicaciones ni meta-comentarios. Solo el texto normativo.
- NO inventes números exactos de artículos. Usa frases como "Artículo N°..." o "conforme a la normativa aplicable...".
- El texto debe sonar como un extracto real de la normativa, no como una respuesta de chat.
- Máximo 150 palabras.`;
}

// --- Función principal ------------------------------------------------------

/**
 * Genera un embedding HyDE combinando la query original con un texto
 * normativo hipotético generado por el modelo.
 *
 * @param pregunta  Consulta original del usuario
 * @param dominios  Dominios detectados por el clasificador (plan.dominiosActivos).
 *                  Determinan el registro del texto hipotético. Si viene vacío
 *                  se usa un encuadre genérico, nunca uno urbanístico.
 * @returns         Vector promediado [query + hipotético], o solo [query] si falla
 */
export async function embedConHyDE(
  pregunta: string,
  dominios: string[] = []
): Promise<number[]> {
  // Siempre generamos el embedding de la query como base (fallback)
  const embeddingQuery = await embedText(pregunta, "query");

  try {
    // Generar texto hipotético con Gemini Flash (rápido, barato)
    // maxRetries:1 - HyDE tiene fallback al embedding directo, no necesita backoff largo
    const hipotetico = await generateWithFallback(
      construirSystem(dominios),
      pregunta,
      {
        modelo: MODEL_FLASH,
        temperature: 0.3,
        maxOutputTokens: 256,
      }
    );

    if (!hipotetico || hipotetico.length < 30) {
      // Respuesta vacía o muy corta - usar solo query
      return embeddingQuery;
    }

    // Embeber el texto hipotético como "document" (similar a los chunks del corpus)
    const embeddingHipotetico = await embedText(hipotetico, "document");

    // Promediar los dos vectores componente a componente
    const combinado = embeddingQuery.map(
      (v, i) => (v + embeddingHipotetico[i]) / 2
    );

    // Normalizar a longitud unitaria (requerido para cosine similarity correcta)
    const norma = Math.sqrt(combinado.reduce((acc, v) => acc + v * v, 0));
    return combinado.map((v) => v / norma);

  } catch {
    // Falla silenciosa: devolver embedding original sin modificar
    return embeddingQuery;
  }
}