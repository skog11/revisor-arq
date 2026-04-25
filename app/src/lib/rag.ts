/**
 * Motor RAG de REVISOR ARQ.
 * Flujo: embed query → match_chunks → construir contexto → generar respuesta.
 */

import { getSupabaseServiceClient } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

export interface CruceDetectado {
  area: string;           // ej. "Medioambiente"
  emoji: string;          // ej. "🌿"
  organismo: string;      // ej. "SEA / SEREMI del Medio Ambiente"
  norma_probable: string; // ej. "Ley N°19.300, DS 40/2012"
  gatillante: string;     // texto que activó el cruce
}

export interface ChunkRecuperado {
  id: string;
  texto: string;
  similarity: number;
  norma_tipo: string;
  norma_numero: string;
  norma_titulo: string;
  articulo: string | null;
  jerarquia: string | null;           // jerarquía a nivel de chunk (metadatos)
  url_fuente: string;
  fecha_vigencia_desde: string | null;
  // Fase 5: metadatos expandidos de la norma
  norma_dominio: string | null;
  norma_organo_emisor: string | null;
  norma_jerarquia_norm: string | null;
  norma_etapas_proyecto: string[];
}

export interface ContextoRAG {
  chunks: ChunkRecuperado[];
  textoContexto: string;
}

// ─── Embedding de query ───────────────────────────────────────────────────────

/**
 * Embedding de queries usando Voyage AI voyage-law-2 (mismo modelo que la ingesta).
 * CRÍTICO: debe coincidir con el modelo usado al embeber documentos,
 * de lo contrario la similitud coseno no tiene ningún significado.
 */
async function embedQuery(texto: string): Promise<number[]> {
  const { embedText } = await import("./voyage");
  return embedText(texto);
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export async function recuperarChunks(
  pregunta: string,
  opts: {
    matchCount?: number;
    filterTipos?: string[];
    soloVigentes?: boolean;
  } = {}
): Promise<ChunkRecuperado[]> {
  const { matchCount = 8, filterTipos, soloVigentes = true } = opts;

  const embedding = await embedQuery(pregunta);
  const sb = getSupabaseServiceClient();

  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    filter_tipos: filterTipos ?? null,
    solo_vigentes: soloVigentes,
  });

  if (error) throw new Error(`Error RPC match_chunks: ${error.message}`);
  if (!data?.length) return [];

  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    texto: r.texto as string,
    similarity: r.similarity as number,
    norma_tipo: r.norma_tipo as string,
    norma_numero: r.norma_numero as string,
    norma_titulo: r.norma_titulo as string,
    articulo: (r.metadatos as Record<string, unknown>)?.articulo as string | null,
    jerarquia: (r.metadatos as Record<string, unknown>)?.jerarquia as string | null,
    url_fuente: r.fuente as string,
    fecha_vigencia_desde: r.fecha_vigencia_desde as string | null,
    // Fase 5: metadatos expandidos (presentes solo tras migración)
    norma_dominio: (r.norma_dominio as string | null) ?? null,
    norma_organo_emisor: (r.norma_organo_emisor as string | null) ?? null,
    norma_jerarquia_norm: (r.norma_jerarquia_norm as string | null) ?? null,
    norma_etapas_proyecto: (r.norma_etapas_proyecto as string[] | null) ?? [],
  }));
}

// ─── Construcción del contexto ────────────────────────────────────────────────

/**
 * Formatea los chunks recuperados como bloque de contexto para el LLM.
 */
export function construirContexto(chunks: ChunkRecuperado[]): ContextoRAG {
  if (!chunks.length) {
    return {
      chunks,
      textoContexto:
        "No se encontraron artículos relevantes en la base de conocimiento.",
    };
  }

  const bloques = chunks.map((c, i) => {
    const normaLabel = `${c.norma_tipo} ${c.norma_numero}`;
    const artLabel = c.articulo ? ` – Art. ${c.articulo}` : "";
    const jerarqLabel = c.jerarquia ? ` (${c.jerarquia})` : "";
    const vigLabel = c.fecha_vigencia_desde
      ? ` [vigente desde ${c.fecha_vigencia_desde}]`
      : "";
    // Fase 5: metadatos expandidos
    const dominioLabel = c.norma_dominio ? ` | Dominio: ${c.norma_dominio}` : "";
    const emisorLabel = c.norma_organo_emisor ? ` | Emisor: ${c.norma_organo_emisor}` : "";
    const jerarqNormLabel = c.norma_jerarquia_norm ? ` | Jerarquía: ${c.norma_jerarquia_norm}` : "";
    const etapasLabel = c.norma_etapas_proyecto?.length
      ? ` | Etapas: ${c.norma_etapas_proyecto.join(", ")}`
      : "";

    return [
      `--- FUENTE [${i + 1}]: ${normaLabel}${artLabel}${jerarqLabel}${vigLabel}${dominioLabel}${emisorLabel}${jerarqNormLabel}${etapasLabel} ---`,
      c.texto,
      "---",
    ].join("\n");
  });

  return {
    chunks,
    textoContexto: bloques.join("\n\n"),
  };
}

// ─── Prompts por modo ─────────────────────────────────────────────────────────

const DISCLAIMER = `

---
⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado antes de tomar decisiones.`;

export function buildSystemPrompt(
  modo: ModoRespuesta,
  contexto: string,
  cruces: CruceDetectado[] = []
): string {
  // Bloque de cruces detectados (se inyecta en el prompt si hay alguno)
  const crucesBloque =
    cruces.length > 0
      ? `\nDOMINIOS NORMATIVOS ADICIONALES DETECTADOS EN LA CONSULTA:
El análisis de la pregunta identificó que los siguientes dominios regulatorios, distintos al urbanismo base, podrían ser relevantes:
${cruces
  .map(
    (c) =>
      `- ${c.emoji} **${c.area}** (gatillante: "${c.gatillante}") → Organismo: ${c.organismo} | Marco probable: ${c.norma_probable}`
  )
  .join("\n")}
Considera estos dominios en tu respuesta. Si el contexto RAG no los cubre, señálalos SIEMPRE en la sección de Alertas de cruce como materias que requieren verificación adicional con el organismo competente.`
      : "";

  const base = `Eres REVISOR ARQ, un asistente especializado en análisis normativo para proyectos en Chile.
Tu base de conocimiento incluye principalmente normativa urbanística y de construcción (LGUC, OGUC, Circulares DDU del MINVU), pero debes estar atento a cruces con otras áreas regulatorias cuando la consulta lo requiera: medioambiente, salud, patrimonio, infraestructura, permisos sectoriales u otras materias que puedan incidir en un proyecto.

IDIOMA Y REGISTRO:
- Escribe siempre en español de Chile.
- Usa "usted" para dirigirte al usuario (registro profesional chileno).
- Nunca uses "vos", "podés", "hacés" ni ninguna forma verbal rioplatense.
- Vocabulario técnico-legal propio del derecho chileno: "permiso de edificación", "recepción definitiva", "DOM", "SEREMI MINVU", "resolución de calificación ambiental", "autorización sanitaria", etc.
- Tono profesional y directo, sin adornos retóricos.
${crucesBloque}
NORMATIVA RECUPERADA DE LA BASE DE CONOCIMIENTO:
${contexto}

REGLAS ABSOLUTAS — NO negociables:
1. NUNCA inventes artículos, normas, parámetros ni citas que no aparezcan en el contexto anterior.
2. Si el contexto no contiene respaldo suficiente, dilo explícitamente: "No encontré respaldo normativo suficiente en la base de conocimiento para esta materia".
3. Toda afirmación técnica o legal DEBE estar respaldada en una fuente del contexto (FUENTE [N]).
4. Si detectas que la consulta puede activar otras áreas regulatorias (medioambiente, salud, patrimonio, etc.) que no están en el contexto, señálalo explícitamente como alerta de cruce.
5. El disclaimer legal al final es OBLIGATORIO en toda respuesta.`;

  // ── MODO ARQUITECTO ───────────────────────────────────────────────────────────
  if (modo === "arquitecto") {
    return (
      base +
      `

MODO ARQUITECTO — enfoque práctico y operativo:
Entrega una respuesta orientada a factibilidad, diseño, ingreso y tramitación. El usuario necesita saber qué puede hacer, qué condiciones aplican y qué sigue.

Estructura tu respuesta SIEMPRE con estas secciones en este orden:

## Respuesta breve
Una o dos oraciones con la respuesta concreta y directa a la consulta. Sin rodeos.

## Normativa aplicable
Lista las normas y artículos relevantes encontrados en el contexto:
- **[Norma] Art. X**: descripción del contenido relevante (FUENTE [N])
Incluye solo lo que está respaldado en el contexto.

## Impacto en diseño / proyecto / permiso
Explica las consecuencias prácticas para el proyecto:
- Qué limita, qué permite, qué condiciona
- Cómo afecta dimensiones, superficies, altura, usos u otras variables de diseño
- Qué impacto tiene en el expediente o en la tramitación del permiso

## Datos faltantes
Lista qué información adicional se necesita para dar una respuesta definitiva:
- Variables del predio que no se conocen (superficie, zonificación, uso de suelo, etc.)
- Antecedentes del proyecto que cambian el análisis
- Documentos o certificados que deben obtenerse primero

## Próximos pasos
Indica el camino a seguir en términos concretos:
- Trámites, consultas previas, certificados, informes
- Organismo competente y etapa del proceso en que aplica cada uno

## Alertas de cruce normativo
(Incluir solo si aplica) Si la consulta puede activar revisión en otras áreas además de urbanismo, indícalo:
- Área: [medioambiente / salud / patrimonio / infraestructura / otro]
- Por qué puede ser relevante
- Qué organismo podría intervenir

REGLAS DE FORMATO:
- Usa **negritas** para valores numéricos, artículos y términos técnicos clave.
- Usa listas con guión (–) para parámetros, condiciones y pasos.
- Si una sección no aplica a la consulta, omítela sin mencionar que la omites.
- Lenguaje técnico pero accesible; orientado a tomar decisiones de proyecto.` +
      DISCLAIMER
    );
  }

  // ── MODO ABOGADO ──────────────────────────────────────────────────────────────
  if (modo === "abogado") {
    return (
      base +
      `

MODO ABOGADO — enfoque jurídico fundado y trazable:
Entrega una respuesta jerárquica, cautelosa y jurídicamente defendible. El usuario necesita fundamento legal sólido, identificación de riesgos y trazabilidad de fuentes.

Estructura tu respuesta SIEMPRE con estas secciones en este orden:

## Conclusión jurídica preliminar
Posición jurídica clara sobre la materia consultada, expresada con el grado de certeza que el contexto permite. Si la respuesta depende de variables no conocidas, indícalo desde el inicio.

## Fundamento normativo
Para cada norma relevante encontrada en el contexto:
> **Art. X° [Norma]**: transcripción literal o casi literal del fragmento pertinente (FUENTE [N])

Indica inciso, letra o número si corresponde. No parafrasees lo que puedes citar.

## Jerarquía de fuentes
Traza la cadena jerárquica de las normas aplicables:
- **Ley** (LGUC u otra ley aplicable)
- **Reglamento** (OGUC u otros decretos reglamentarios)
- **Instrucción** (Circulares DDU, resoluciones, ordinarios)
Señala si alguna norma de rango inferior puede estar en tensión con una superior.

## Normas concordantes o en tensión
Identifica remisiones entre normas ("el Art. X remite al Art. Y") y posibles conflictos normativos detectados en el contexto. Si hay tensión, explica cuál norma prevalece y por qué.

## Riesgos interpretativos
- Ambigüedades o lagunas que el texto normativo no resuelve
- Variabilidad de criterio entre órganos (DOM, SEREMI, contraloría, tribunales)
- Aspectos donde la aplicación puede diferir según el caso concreto

## Materias sujetas a criterio de autoridad o caso específico
Lista las materias que, aunque estén reguladas, requieren pronunciamiento o consulta directa a la autoridad competente antes de actuar. Indica el organismo pertinente.

REGLAS DE FORMATO:
- Usa > blockquote para todas las citas textuales de artículos.
- Usa **negritas** para números de artículos, nombres de normas y términos jurídicos clave.
- Separa claramente cada sección con su encabezado ##.
- Tono técnico, cauteloso y argumentativo. Nunca afirmes con certeza lo que el contexto no respalda.` +
      DISCLAIMER
    );
  }

  // ── MODO PROFUNDO ─────────────────────────────────────────────────────────────
  return (
    base +
    `

MODO ANÁLISIS PROFUNDO — lectura multidisciplinaria e intersectorial:
No es una respuesta más larga. Es una reconstrucción del ecosistema regulatorio completo del caso. Cruza áreas, identifica dependencias y entrega una hoja de ruta accionable.

Estructura tu respuesta SIEMPRE con estas secciones en este orden:

## 1. Resumen del caso
Síntesis del problema regulatorio planteado: qué se consulta, qué tipo de proyecto o situación involucra, y cuáles son las variables determinantes para el análisis.

## 2. Marco regulatorio total detectado
Lista todas las fuentes normativas relevantes encontradas en el contexto, organizadas por jerarquía y área:
- **Urbanismo / construcción**: [normas detectadas]
- **Otras áreas** (si aplica): [medioambiente, salud, patrimonio, infraestructura, etc.]
Para cada norma: nombre, artículo relevante y síntesis de su contenido (FUENTE [N]).

## 3. Cruces entre áreas regulatorias
Identifica si la consulta activa revisión en áreas distintas al urbanismo. Para cada cruce detectado:
- **Área**: nombre del dominio regulatorio
- **Gatillante**: qué característica del proyecto o consulta activa esta área
- **Norma o instrumento probable**: cuál podría ser el marco aplicable
- **Organismo competente**: quién interviene
- **Etapa**: en qué momento del proyecto se activa

Si no se detectan cruces relevantes, indicarlo explícitamente.

## 4. Permisos / autorizaciones / informes potencialmente aplicables
Lista los documentos habilitantes que podrían ser necesarios:

| Documento | Organismo | Etapa del proyecto | Condición de exigibilidad |
|-----------|-----------|-------------------|--------------------------|
| [nombre]  | [entidad] | [etapa]           | [cuándo aplica]          |

Incluye solo los que el contexto o el análisis de cruces permiten identificar con fundamento.

## 5. Matriz de aplicabilidad normativa
Resumen estructurado de las normas identificadas:

| Norma | Artículo | Materia | Condición de aplicación | Efecto |
|-------|----------|---------|------------------------|--------|
| [norma] | [art.] | [materia] | [cuándo aplica] | [qué limita/permite/exige] |

## 6. Riesgos y vacíos normativos
- Ambigüedades o contradicciones detectadas en el contexto
- Materias que el contexto no cubre pero que probablemente son relevantes
- Aspectos donde la aplicación depende de criterio de autoridad o caso específico
- Riesgos de interpretación divergente entre organismos

## 7. Hoja de ruta regulatoria
Secuencia recomendada de pasos para abordar la situación:

1. **[Paso]**: descripción — organismo responsable — documentos necesarios
2. **[Paso]**: …

Ordenar cronológicamente según la lógica del proceso (qué se hace primero, qué depende de qué).

REGLAS ADICIONALES DEL MODO PROFUNDO:
- Sé exhaustivo pero preciso. Si el contexto no respalda algo, dilo en la sección 6.
- Las tablas son obligatorias en secciones 4 y 5 si hay más de un ítem.
- No omitas la sección 3 aunque no detectes cruces; en ese caso escribe explícitamente que no se detectaron cruces en esta consulta.
- Usa **negritas** para artículos, organismos y términos clave.` +
    DISCLAIMER
  );
}

// ─── Motor de cruces regulatorios ────────────────────────────────────────────

/**
 * Definición de dominios normativos que pueden cruzarse con urbanismo/construcción.
 * Cada entrada incluye patrones de keywords y metadatos para mostrar al usuario.
 */
const DOMINIOS_CRUCE: Array<{
  area: string;
  emoji: string;
  organismo: string;
  norma_probable: string;
  patrones: RegExp[];
}> = [
  {
    area: "Medioambiente",
    emoji: "🌿",
    organismo: "SEA / SEREMI del Medio Ambiente",
    norma_probable: "Ley N°19.300 (LGBMA), DS 40/2012",
    patrones: [
      /impacto ambiental|evaluaci[oó]n ambiental|rca\b|sea\b|conama/i,
      /\bhumedal|zona de amortiguaci[oó]n|flora.*nativa|fauna.*protegida/i,
      /contaminaci[oó]n del suelo|pasivo ambiental|remediaci[oó]n/i,
      /declaraci[oó]n de impacto|estudio de impacto/i,
    ],
  },
  {
    area: "Patrimonio",
    emoji: "🏛️",
    organismo: "Consejo de Monumentos Nacionales (CMN)",
    norma_probable: "Ley N°17.288 de Monumentos Nacionales",
    patrones: [
      /monument[oa] nacional|zona t[íi]pica|bien nacional protegido/i,
      /\bcmn\b|consejo de monumentos/i,
      /patrimon[io]+|edificio hist[oó]rico|inmueble de conservaci[oó]n/i,
      /zona de conservaci[oó]n hist[oó]rica/i,
    ],
  },
  {
    area: "Salud",
    emoji: "⚕️",
    organismo: "SEREMI de Salud / MINSAL",
    norma_probable: "Código Sanitario, DS 594/1999, DS 78/2009",
    patrones: [
      /sanitari[oa]|seremi.*salud|autorización sanitaria/i,
      /residuo(s)? (peligros|tóxic|hospitalari)/i,
      /efluente(s)?|aguas servidas|planta de tratamiento/i,
      /ruido(s)? moles(to|tia)|contaminaci[oó]n ac[uú]stica/i,
      /higiene.*ambient|salud.*ambient/i,
    ],
  },
  {
    area: "Infraestructura vial",
    emoji: "🛣️",
    organismo: "MOP / SERVIU / Municipalidad",
    norma_probable: "DFL MOP N°850/1997, Ley de Caminos",
    patrones: [
      /camino p[uú]blico|faja vial|derecho de v[ií]a/i,
      /\bmop\b|direcci[oó]n de vialidad/i,
      /autopista|carretera|ruta nacional/i,
      /acceso vial|ingreso vehicular.*ruta/i,
    ],
  },
  {
    area: "Aguas",
    emoji: "💧",
    organismo: "DGA (Dirección General de Aguas)",
    norma_probable: "Código de Aguas (DFL N°1.122/1981)",
    patrones: [
      /\bdga\b|direcci[oó]n general de aguas/i,
      /derechos de agua|aprovechamiento de aguas/i,
      /cauce|ribera|[aá]lv[ae]o|lecho del r[ií]o/i,
      /inundaci[oó]n|zona de inundaci[oó]n|cota de inundaci[oó]n/i,
      /napa fre[aá]tica|aguas subterr[aá]neas/i,
    ],
  },
  {
    area: "Electricidad y telecomunicaciones",
    emoji: "⚡",
    organismo: "SEC / CNE / Subsecretaría de Telecomunicaciones",
    norma_probable: "DFL N°4/2006 (Ley Eléctrica General), Ley N°18.168",
    patrones: [
      /\bsec\b|superintendencia de electricidad/i,
      /tendido el[eé]ctrico|l[ií]nea de alta tensi[oó]n|subestaci[oó]n/i,
      /antena(s)?.*telecomunicacion|torre.*celular|radiobase/i,
      /energia solar|paneles fotovolt|generaci[oó]n distribuida/i,
    ],
  },
  {
    area: "Defensa Nacional",
    emoji: "🛡️",
    organismo: "Ministerio de Defensa / DGAC / Armada",
    norma_probable: "DFL N°221/1978, Ley N°16.752",
    patrones: [
      /zona de seguridad nacional|zona de frontera/i,
      /\bdgac\b|aeron[aá]utica civil|servidumbre aeron[aá]utica/i,
      /cono de aproximaci[oó]n|altura m[aá]xima.*aeropuerto/i,
      /\barmada\b.*zona|borde costero.*defensa/i,
    ],
  },
  {
    area: "Bienes Nacionales",
    emoji: "🏔️",
    organismo: "Ministerio de Bienes Nacionales / CONAF",
    norma_probable: "DL N°1.939/1977, Ley N°18.362",
    patrones: [
      /bien nacional de uso p[uú]blico|bienes fiscales/i,
      /\bconaf\b|parque nacional|reserva nacional/i,
      /concesi[oó]n marit[íi]ma|borde costero|playa.*acceso/i,
      /glaciar|campo de hielo/i,
    ],
  },
];

/**
 * Detecta dominios normativos adicionales que la consulta podría activar,
 * más allá del urbanismo/construcción base (LGUC, OGUC, DDU).
 *
 * Ejecución sincrónica y rápida (regex sobre texto); no requiere LLM.
 */
export function detectarCruces(pregunta: string): CruceDetectado[] {
  const cruces: CruceDetectado[] = [];
  const texto = pregunta.toLowerCase();

  for (const dominio of DOMINIOS_CRUCE) {
    for (const patron of dominio.patrones) {
      const match = texto.match(patron);
      if (match) {
        cruces.push({
          area: dominio.area,
          emoji: dominio.emoji,
          organismo: dominio.organismo,
          norma_probable: dominio.norma_probable,
          gatillante: match[0],
        });
        break; // un cruce por dominio es suficiente
      }
    }
  }

  return cruces;
}

// ─── Guardrails ───────────────────────────────────────────────────────────────

/** Temas fuera del dominio de la app */
const TEMAS_FUERA_DOMINIO = [
  /impuesto|tributari|sri|sii/i,
  /receta|cocina|aliment/i,
  /medicina|enfermedad|tratamiento médico/i,
  /código civil|código penal|código laboral/i,
  /\\bsueldo\\b|\\bsalario\\b|\\bcontrato laboral\\b/i,
];

/**
 * Detecta si la pregunta está fuera del dominio urbano-normativo.
 * Retorna un mensaje de rechazo o null si está dentro del dominio.
 */
export function detectarFueraDominio(pregunta: string): string | null {
  for (const re of TEMAS_FUERA_DOMINIO) {
    if (re.test(pregunta)) {
      return (
        "Esta consulta parece estar fuera del ámbito de REVISOR ARQ, que cubre exclusivamente " +
        "normativa chilena de urbanismo y construcción (LGUC, OGUC, DDU). " +
        "Por favor reformula tu pregunta en ese contexto."
      );
    }
  }
  return null;
}

/**
 * Valida que la respuesta generada cumpla los guardrails mínimos:
 * - Tiene disclaimer
 * - No es demasiado corta (< 50 chars)
 */
export function validarRespuesta(respuesta: string): { valida: boolean; motivo?: string } {
  if (respuesta.trim().length < 50) {
    return { valida: false, motivo: "Respuesta demasiado corta" };
  }
  // El disclaimer es obligatorio; si el LLM lo omitió, lo añadimos
  const tieneDisclaimer =
    respuesta.includes("Aviso legal") ||
    respuesta.includes("asesoría jurídica") ||
    respuesta.includes("profesional habilitado");
  if (!tieneDisclaimer) {
    return { valida: false, motivo: "Falta disclaimer legal" };
  }
  return { valida: true };
}

// ─── Guardar consulta ─────────────────────────────────────────────────────────

export async function guardarConsulta(opts: {
  id?: string;           // UUID pre-generado para devolver al cliente
  pregunta: string;
  modo: ModoRespuesta;
  respuesta: string;
  chunksUsados: ChunkRecuperado[];
  modelo: string;
  latenciaMs: number;
}): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    const row: Record<string, unknown> = {
      pregunta: opts.pregunta,
      modo: opts.modo,
      respuesta: opts.respuesta,
      chunks_usados: opts.chunksUsados.map((c) => ({
        id: c.id,
        norma: `${c.norma_tipo} ${c.norma_numero}`,
        articulo: c.articulo,
        similarity: c.similarity,
      })),
      modelo: opts.modelo,
      latencia_ms: opts.latenciaMs,
    };
    if (opts.id) row.id = opts.id;
    await sb.from("consultas").insert(row);
  } catch {
    // No crítico — no interrumpir la respuesta al usuario
  }
}
