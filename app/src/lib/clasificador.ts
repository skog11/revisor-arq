import { generateGemini } from "./gemini";

export type TipoProyecto =
  | "edificacion_nueva"
  | "ampliacion"
  | "cambio_destino"
  | "subdivision"
  | "condominios"
  | "obra_menor"
  | "regularizacion"
  | "instalacion_especial"
  | "consulta_normativa"
  | "otro";

export type EtapaProyecto =
  | "prefactibilidad"
  | "anteproyecto"
  | "ingreso_permiso"
  | "obra"
  | "recepcion"
  | "postventas"
  | "no_aplica";

export type DominioPrimario =
  | "urbanismo"
  | "construccion"
  | "accesibilidad"
  | "copropiedad"
  | "medioambiente"
  | "patrimonio"
  | "salud"
  | "aguas"
  | "vialidad"
  | "electricidad"
  | "defensa"
  | "bienes_nacionales";

export interface QueryClassificada {
  tipo_proyecto: TipoProyecto;
  etapa: EtapaProyecto;
  dominios_detectados: DominioPrimario[]; // first = primary domain
  keywords_normativas: string[];
  requiere_jerarquia: boolean;
  confianza: "alta" | "media" | "baja";
  resumen_consulta: string;
}

const FALLBACK: QueryClassificada = {
  tipo_proyecto: "consulta_normativa",
  etapa: "no_aplica",
  dominios_detectados: ["construccion"],
  keywords_normativas: [],
  requiere_jerarquia: false,
  confianza: "baja",
  resumen_consulta: "",
};

const SYSTEM_PROMPT = `Eres un clasificador de consultas normativas de urbanismo y construcción en Chile.

Dado el texto de una consulta del usuario, debes responder ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones, sin bloques de código) que tenga exactamente la siguiente estructura:

{
  "tipo_proyecto": string,
  "etapa": string,
  "dominios_detectados": string[],
  "keywords_normativas": string[],
  "requiere_jerarquia": boolean,
  "confianza": string,
  "resumen_consulta": string
}

Valores válidos para cada campo:

tipo_proyecto (uno de):
  "edificacion_nueva" | "ampliacion" | "cambio_destino" | "subdivision" | "condominios" |
  "obra_menor" | "regularizacion" | "instalacion_especial" | "consulta_normativa" | "otro"

etapa (uno de):
  "prefactibilidad" | "anteproyecto" | "ingreso_permiso" | "obra" | "recepcion" |
  "postventas" | "no_aplica"

dominios_detectados (lista ordenada, el primero es el dominio principal, uno o más de):
  "urbanismo" | "construccion" | "accesibilidad" | "copropiedad" | "medioambiente" |
  "patrimonio" | "salud" | "aguas" | "vialidad" | "electricidad" | "defensa" | "bienes_nacionales"

keywords_normativas: lista de términos normativos relevantes detectados en la consulta (pueden ser vacíos si no hay).

requiere_jerarquia: true si la consulta involucra conflicto o relación entre distintas normas (LGUC, OGUC, DDU, PRC, etc.), false en caso contrario.

confianza (uno de):
  "alta" — la consulta es clara y específica
  "media" — la consulta es parcialmente clara
  "baja" — la consulta es ambigua o insuficiente

resumen_consulta: resumen breve de la consulta en no más de 120 caracteres.

Responde SOLO con el JSON. No incluyas markdown, bloques de código ni texto adicional.`;

function stripMarkdownJson(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers if present
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

export async function clasificarConsulta(
  pregunta: string,
): Promise<QueryClassificada> {
  try {
    const raw = await generateGemini(SYSTEM_PROMPT, pregunta);
    const cleaned = stripMarkdownJson(raw);
    const parsed = JSON.parse(cleaned) as QueryClassificada;
    return parsed;
  } catch {
    return {
      ...FALLBACK,
      resumen_consulta: pregunta.slice(0, 120),
    };
  }
}
