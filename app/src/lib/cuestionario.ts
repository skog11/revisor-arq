import type { CuestionarioData } from "@/components/chat/cuestionario-card";

type ClasificacionCuestionario = {
  confianza: string;
};

type ContextoCuestionario = {
  zonaSuelo?: string;
  destino?: string;
};

function tieneReferenciaNormativaExplicita(pregunta: string): boolean {
  return /\b(?:art(?:ículo)?\.?\s*\d[\w.-]*|(?:ley|decreto|d\.?\s*s\.?|ddu|circular)\s*(?:n[°ºo]\s*)?\d[\w.-]*|oguc|lguc)\b/i.test(
    pregunta,
  );
}

/**
 * Decide si conviene pedir antecedentes antes de consultar la base normativa.
 * Las referencias normativas explícitas siempre continúan hacia recuperación:
 * incluso una referencia inexistente necesita una respuesta de no hallazgo.
 */
export function detectarCuestionario(
  pregunta: string,
  clasificacion: ClasificacionCuestionario,
  contextoProyecto?: ContextoCuestionario,
): CuestionarioData | null {
  const tieneDocumentoAdjunto = pregunta.includes("--- CONTEXTO DEL PROYECTO");
  const preguntaVaga =
    /qué puedes decir|analiza|qué ves|qué dice|qué contiene|qué muestra|qué indica|qué observas|revisa este|revisa el|analiza el|analiza este/i.test(
      pregunta,
    );
  const preguntaCIP = /cip|certificado de informaciones previas/i.test(pregunta);

  if (tieneDocumentoAdjunto && (preguntaVaga || preguntaCIP)) {
    const esCIP = preguntaCIP;
    return {
      titulo: esCIP
        ? "Para analizar el CIP con precisión, necesito saber:"
        : "Para analizar el documento adjunto con precisión:",
      descripcion:
        "El documento ha sido leído. Con esta información identificaré las normas exactas que aplican.",
      preguntas: [
        {
          id: "objetivo",
          texto: "¿Qué desea verificar en este documento?",
          tipo: "opciones",
          opciones: esCIP
            ? [
                "Vigencia y parámetros del CIP (constructibilidad, altura, rasantes)",
                "Comparar con la normativa actual del PRC",
                "Detectar restricciones o alertas normativas",
                "Preparar antecedentes para un permiso de edificación",
              ]
            : [
                "Verificar cumplimiento normativo",
                "Identificar normas aplicables",
                "Detectar vacíos o inconsistencias",
                "Preparar informe técnico",
              ],
        },
        {
          id: "etapa",
          texto: "¿En qué etapa se encuentra el proyecto?",
          tipo: "opciones",
          opciones: [
            "Diseño / Anteproyecto",
            "Permiso de edificación",
            "En construcción",
            "Recepción definitiva",
          ],
        },
      ],
    };
  }

  if (
    clasificacion.confianza === "baja" &&
    !tieneReferenciaNormativaExplicita(pregunta) &&
    !contextoProyecto?.zonaSuelo &&
    !contextoProyecto?.destino
  ) {
    return {
      titulo: "Necesito más información para responder con precisión",
      descripcion:
        "La consulta es ambigua. Con estos datos identificaré las normas correctas para su caso.",
      preguntas: [
        {
          id: "zona_suelo",
          texto: "¿El predio está dentro o fuera del límite urbano?",
          tipo: "opciones",
          opciones: ["Urbano", "Rural", "Extensión Urbana", "No lo sé aún"],
        },
        {
          id: "destino",
          texto: "¿Cuál es el destino principal de la edificación?",
          tipo: "opciones",
          opciones: [
            "Residencial",
            "Equipamiento (salud, educación, comercio)",
            "Actividad Productiva / Industrial",
            "No aplica / Otro",
          ],
        },
        {
          id: "aspecto",
          texto: "¿Qué aspecto específico necesita resolver?",
          tipo: "texto",
          placeholder:
            "Ej: altura máxima permitida, número de estacionamientos, retiro frontal…",
        },
      ],
    };
  }

  return null;
}
