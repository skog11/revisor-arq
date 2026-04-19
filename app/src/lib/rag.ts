/**
 * Motor RAG de REVISOR ARQ.
 * Flujo: embed query → match_chunks → construir contexto → generar respuesta.
 */

import { getSupabaseServiceClient } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ModoRespuesta = "arquitecto" | "abogado" | "profundo";

export interface ChunkRecuperado {
  id: string;
  texto: string;
  similarity: number;
  norma_tipo: string;
  norma_numero: string;
  norma_titulo: string;
  articulo: string | null;
  jerarquia: string | null;
  url_fuente: string;
  fecha_vigencia_desde: string | null;
}

export interface ContextoRAG {
  chunks: ChunkRecuperado[];
  textoContexto: string;
}

// ─── Embedding de query ───────────────────────────────────────────────────────

async function embedQuery(texto: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { role: "user", parts: [{ text: texto }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1024,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error embedding query: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { embedding: { values: number[] } };
  return json.embedding.values;
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

    return [
      `--- FUENTE [${i + 1}]: ${normaLabel}${artLabel}${jerarqLabel}${vigLabel} ---`,
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

export function buildSystemPrompt(modo: ModoRespuesta, contexto: string): string {
  const base = `Eres un asistente especializado en normativa chilena de urbanismo y construcción.
Tienes acceso a fragmentos de la LGUC (Ley General de Urbanismo y Construcciones), la OGUC (Ordenanza General) y Circulares DDU del MINVU.

CONTEXTO NORMATIVO RECUPERADO:
${contexto}

REGLAS ABSOLUTAS — NO negociables:
1. NUNCA inventes artículos, normas, parámetros o citas que no aparezcan en el contexto anterior.
2. Si el contexto no contiene información suficiente, dilo explícitamente: "No encontré respaldo normativo suficiente en la base de conocimiento".
3. Toda afirmación técnica o legal DEBE estar respaldada por una cita del contexto (FUENTE [N]).
4. El disclaimer legal al final es OBLIGATORIO.`;

  if (modo === "arquitecto") {
    return (
      base +
      `

MODO ARQUITECTO — enfoque práctico:
- Responde con los parámetros aplicables (coeficientes, alturas, distanciamientos, etc.).
- Usa ejemplos concretos cuando sea útil.
- Estructura: parámetro → valor → artículo de respaldo → observaciones prácticas.
- Lenguaje técnico pero accesible.
- Al citar, indica: "según el Art. X° de la LGUC" o "conforme al Art. X.X.X de la OGUC".` +
      DISCLAIMER
    );
  }

  if (modo === "abogado") {
    return (
      base +
      `

MODO ABOGADO — enfoque normativo estricto:
- Cita el texto literal de los artículos relevantes entre comillas.
- Incluye la cadena normativa completa: ley → ordenanza → circular DDU si corresponde.
- Identifica posibles vacíos, contradicciones o remisiones a otras normas.
- Lenguaje jurídico preciso.
- Al citar, indica la fuente exacta: norma, número de artículo y, si aplica, inciso o letra.` +
      DISCLAIMER
    );
  }

  // modo profundo
  return (
    base +
    `

MODO ANÁLISIS PROFUNDO — análisis exhaustivo multi-norma:
Estructura tu respuesta SIEMPRE con estas secciones:

## 1. Síntesis ejecutiva
Resumen de 2-3 oraciones de la respuesta principal.

## 2. Marco normativo aplicable
Lista las normas relevantes encontradas en el contexto, con jerarquía (LGUC → OGUC → DDU).

## 3. Análisis artículo por artículo
Para cada artículo relevante encontrado en el contexto:
- Cita textual (entre comillas) del fragmento más relevante
- Interpretación y alcance
- Condiciones, excepciones o requisitos

## 4. Cadena de remisiones
Identifica si algún artículo remite a otro (p.ej. "conforme al Art. X de la OGUC") y traza la cadena completa con lo que encuentres en el contexto.

## 5. Aspectos no cubiertos o posibles vacíos
Lista explícita de lo que NO está en el contexto recuperado y podría ser relevante para una consulta completa.

## 6. Recomendaciones prácticas
- Para el profesional: qué verificar antes de actuar.
- Normas adicionales que probablemente apliquen (aunque no estén en el contexto).

REGLAS ADICIONALES DEL MODO PROFUNDO:
- Sé exhaustivo pero preciso — prefiere calidad sobre brevedad.
- Si el contexto no cubre un aspecto importante, dilo en la sección 5.
- Usa negritas para los artículos citados.` +
    DISCLAIMER
  );
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
  pregunta: string;
  modo: ModoRespuesta;
  respuesta: string;
  chunksUsados: ChunkRecuperado[];
  modelo: string;
  latenciaMs: number;
}): Promise<void> {
  try {
    const sb = getSupabaseServiceClient();
    await sb.from("consultas").insert({
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
    });
  } catch {
    // No crítico — no interrumpir la respuesta al usuario
  }
}
