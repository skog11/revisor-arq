import { generateWithFallback } from "./gemini";

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
  | "bienes_nacionales"
  // Transversal: procedimiento administrativo, transparencia, organica
  // municipal y regional, consulta indigena. Normas que aplican a
  // cualquier proyecto sin ser de una materia tecnica.
  | "administrativo"
  // Impuestos y tributos relacionados a inmuebles: contribuciones/avaluo
  // fiscal (Ley 17.235), IVA en venta de inmuebles (DL 825), mayor valor
  // en enajenacion de bienes raices (DL 824), timbres y estampillas
  // (DL 3.475). NO incluye materia tributaria general de empresas.
  | "tributario";

export interface QueryClassificada {
  tipo_proyecto: TipoProyecto;
  etapa: EtapaProyecto;
  dominios_detectados: DominioPrimario[]; // first = primary domain
  keywords_normativas: string[];
  requiere_jerarquia: boolean;
  confianza: "alta" | "media" | "baja";
  resumen_consulta: string;
  /**
   * true cuando el clasificador no pudo ejecutarse (proveedor LLM caído, JSON
   * ilegible) y se devolvió FALLBACK. No es lo mismo que una clasificación real
   * con confianza baja: la consulta puede ser perfectamente clara y ser el
   * servicio el que falló. Quien consuma `confianza` debe mirar esta bandera
   * antes de sacar conclusiones sobre la consulta del usuario.
   */
  clasificacion_fallida?: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
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
  "patrimonio" | "salud" | "aguas" | "vialidad" | "electricidad" | "defensa" | "bienes_nacionales" |
  "administrativo" | "tributario"

  Usa "administrativo" cuando la consulta trate de plazos, silencio administrativo, recursos
  o reclamaciones, competencia de la DOM o de la SEREMI, acceso a información pública o
  consulta indígena.
  Usa "tributario" cuando la consulta trate de contribuciones, avaluó fiscal, reavaluó,
  reclasificación de un terreno agrícola a urbano y su efecto tributario, IVA en venta de
  inmuebles, mayor valor o ganancia de capital en la enajenación de un bien raíz, o impuesto
  de timbres y estampillas en operaciones inmobiliarias -- en general, cualquier pregunta
  sobre el SII o impuestos asociados a un terreno o inmueble.

keywords_normativas: lista de términos normativos relevantes detectados en la consulta (pueden ser vacíos si no hay).

requiere_jerarquia: true si la consulta involucra conflicto o relación entre distintas normas (LGUC, OGUC, DDU, PRC, etc.), false en caso contrario.

confianza (uno de):
  "alta" — la consulta es clara y específica
  "media" — la consulta es parcialmente clara
  "baja" — la consulta es ambigua o insuficiente

resumen_consulta: resumen breve de la consulta en no más de 120 caracteres.

Responde SOLO con el JSON. No incluyas markdown, bloques de código ni texto adicional.`;

function stripMarkdownJson(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers if present.
  // ^\s* en lugar de ^ para capturar newlines antes del fence que Gemini a veces emite.
  return raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export interface ProcesamientoEntrada {
  standalone_query: string;
  clasificacion: QueryClassificada;
}

const SYSTEM_PROMPT_COMBINED = `Eres un asistente experto en normativa de urbanismo y construcción en Chile. Tu tarea es procesar una consulta de usuario, considerando el historial de chat si existe.

DEBES responder ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con la siguiente estructura:

{
  "standalone_query": "pregunta reescrita para ser independiente y apta para búsqueda RAG",
  "clasificacion": {
    "tipo_proyecto": "edificacion_nueva" | "ampliacion" | "cambio_destino" | "subdivision" | "condominios" | "obra_menor" | "regularizacion" | "instalacion_especial" | "consulta_normativa" | "otro",
    "etapa": "prefactibilidad" | "anteproyecto" | "ingreso_permiso" | "obra" | "recepcion" | "postventas" | "no_aplica",
    "dominios_detectados": ["urbanismo", "construccion", ...],
    "keywords_normativas": ["Art. 116", "LGUC", ...],
    "requiere_jerarquia": boolean,
    "confianza": "alta" | "media" | "baja",
    "resumen_consulta": "resumen breve de máx 120 chars"
  }
}

REGLAS PARA STANDALONE_QUERY:
1. Si hay historial, reescribe la pregunta para que incluya todo el contexto necesario.
2. Si NO hay historial o la pregunta ya es independiente, devuélvela tal cual.
3. Mantén el lenguaje técnico legal chileno.

REGLAS PARA CLASIFICACIÓN:
- tipo_proyecto: elige el más cercano.
- dominios_detectados: lista ordenada, el primero es el principal. Dominios válidos: urbanismo, construccion, accesibilidad, copropiedad, medioambiente, patrimonio, salud, aguas, vialidad, electricidad, defensa, bienes_nacionales, administrativo.
  Usa "administrativo" para plazos y silencio administrativo, recursos y reclamaciones, competencia de la DOM o SEREMI, acceso a información pública, consulta indígena y materia tributaria del proyecto.
- requiere_jerarquia: true si involucra conflicto o relación entre distintas normas.

Responde SOLO con el JSON.`;

export async function procesarEntrada(
  pregunta: string,
  mensajes?: Message[]
): Promise<ProcesamientoEntrada> {
  const chatHistory = (mensajes && mensajes.length > 1)
    ? mensajes.slice(0, -1).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
    : "SIN HISTORIAL";

  const prompt = `HISTORIAL:
${chatHistory}

NUEVA PREGUNTA:
${pregunta}`;

  try {
    const raw = await generateWithFallback(SYSTEM_PROMPT_COMBINED, prompt, {
      temperature: 0,
      maxOutputTokens: 1024,
    });
    const cleaned = stripMarkdownJson(raw);
    const parsed = JSON.parse(cleaned) as ProcesamientoEntrada;
    return parsed;
  } catch (err) {
    console.error("[clasificador] error en procesarEntrada:", err);
    return {
      standalone_query: pregunta,
      clasificacion: {
        ...FALLBACK,
        resumen_consulta: pregunta.slice(0, 120),
        clasificacion_fallida: true,
      }
    };
  }
}

export async function clasificarConsulta(
  pregunta: string,
): Promise<QueryClassificada> {
  const res = await procesarEntrada(pregunta);
  return res.clasificacion;
}

/**
 * Re-escribe la última pregunta del usuario basándose en el historial
 * para que sea una consulta independiente (standalone) apta para RAG.
 */
export async function generarStandaloneQuery(
  mensajes: Message[]
): Promise<string> {
  const res = await procesarEntrada(mensajes[mensajes.length - 1].content, mensajes);
  return res.standalone_query;
}
