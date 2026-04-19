/**
 * Motor RAG de REVISOR ARQ.
 * Flujo: embed query → match_chunks → construir contexto → generar respuesta.
 */

import { getSupabaseServiceClient } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ModoRespuesta = "arquitecto" | "abogado";

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

  // modo abogado
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
