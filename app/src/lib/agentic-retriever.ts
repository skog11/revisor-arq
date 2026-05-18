/**
 * agentic-retriever.ts — Agentic RAG de 2 rondas
 *
 * Pipeline:
 *   Ronda 1: retrieval estándar con recuperarPorCapas
 *       ↓
 *   Análisis de gaps: el modelo identifica qué falta (JSON)
 *       ↓
 *   Ronda 2 (si hay gaps): búsquedas adicionales focalizadas con recuperarMultiQuery
 *       ↓
 *   Merge y dedup de todos los chunks, limitado a maxChunksFinal
 */

import { type ChunkRecuperado } from "./rag";
import { recuperarPorCapas } from "./retriever";
import { generateWithFallback, MODEL_FLASH } from "./gemini";
import { type PlanRecuperacion } from "./router";
import { recuperarMultiQuery } from "./multi-query";

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface Gap {
  aspecto: string;
  query: string;
}

interface AnalisisGaps {
  gaps: Gap[];
  cobertura: "completa" | "parcial" | "insuficiente";
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_ANALIZADOR = `Eres un analizador de cobertura normativa. Dado el resultado de una búsqueda en el corpus de normativa chilena, identifica si faltan aspectos importantes para responder la consulta.

Responde SOLO con JSON (sin markdown):
{
  "gaps": [
    { "aspecto": "descripción breve del aspecto faltante", "query": "búsqueda específica para encontrarlo" }
  ],
  "cobertura": "completa" | "parcial" | "insuficiente"
}

Máximo 3 gaps. Si la cobertura es completa, devuelve gaps=[].`;

// ─── Análisis de gaps ─────────────────────────────────────────────────────────

/**
 * Construye el resumen de chunks para enviarlo al modelo analizador.
 */
function construirResumenChunks(chunks: ChunkRecuperado[]): string {
  return chunks
    .map((c) => {
      const norma = `${c.norma_tipo} ${c.norma_numero}`;
      const articulo = c.articulo ? ` - Art. ${c.articulo}` : "";
      const fragmento = c.texto.slice(0, 100);
      return `${norma}${articulo}: ${fragmento}`;
    })
    .join("\n");
}

/**
 * Llama al modelo para identificar gaps de cobertura en los chunks recuperados.
 * Falla silenciosa: retorna null si el modelo no responde o el JSON es inválido.
 */
async function analizarGaps(
  pregunta: string,
  chunks: ChunkRecuperado[]
): Promise<AnalisisGaps | null> {
  const resumenChunks = construirResumenChunks(chunks);

  const userMessage = `CONSULTA ORIGINAL: ${pregunta}

CHUNKS ENCONTRADOS (resumen):
${resumenChunks}

¿Qué aspectos normativos importantes para responder esta consulta NO están cubiertos por los chunks encontrados?`;

  try {
    const respuesta = await generateWithFallback(SYSTEM_ANALIZADOR, userMessage, {
      modelo: MODEL_FLASH,
      temperature: 0,
      maxOutputTokens: 400,
    });

    // Limpiar posible markdown residual (```json ... ```)
    const jsonLimpio = respuesta
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const analisis = JSON.parse(jsonLimpio) as AnalisisGaps;

    // Validar estructura mínima esperada
    if (!Array.isArray(analisis.gaps) || typeof analisis.cobertura !== "string") {
      return null;
    }

    // Limitar a 3 gaps como máximo
    analisis.gaps = analisis.gaps.slice(0, 3);

    return analisis;
  } catch {
    // JSON inválido o error de red → falla silenciosa
    return null;
  }
}

// ─── Función principal exportada ──────────────────────────────────────────────

/**
 * Agentic RAG de 2 rondas.
 *
 * Ronda 1: recuperarPorCapas (retrieval estándar con jerarquía normativa,
 *           HyDE, multi-query y reranking).
 * Análisis: el modelo identifica gaps en la cobertura de los chunks.
 * Ronda 2: para cada gap detectado, recuperarMultiQuery con la query focalizada.
 * Merge: ronda1 tiene prioridad; se añaden chunks nuevos de ronda2 hasta el límite.
 *
 * Falla silenciosa en toda la lógica agéntica: si algo falla en el análisis
 * o en la ronda 2, se retorna ronda1 intacta.
 *
 * @param pregunta       Consulta original del usuario
 * @param plan           Plan de recuperación generado por routear()
 * @param maxChunksFinal Límite total de chunks en el resultado (default 20)
 * @param timeoutMs      Tiempo máximo total en ms antes de omitir la ronda 2 (default 45s)
 */
export async function recuperarAgenticamente(
  pregunta: string,
  plan: PlanRecuperacion,
  maxChunksFinal: number = 20,
  timeoutMs: number = 45_000
): Promise<ChunkRecuperado[]> {
  const startedAt = Date.now();

  // ── Ronda 1: retrieval estándar ───────────────────────────────────────────
  const ronda1 = await recuperarPorCapas(pregunta, plan);

  // Sin base suficiente para analizar gaps → retornar directamente
  if (ronda1.length < 3) {
    return ronda1;
  }

  // ── Análisis de gaps ──────────────────────────────────────────────────────
  let analisis: AnalisisGaps | null = null;
  try {
    analisis = await analizarGaps(pregunta, ronda1);
  } catch {
    // Falla silenciosa
    return ronda1;
  }

  // Sin análisis válido, cobertura completa o sin gaps → retornar ronda1
  if (
    analisis === null ||
    analisis.cobertura === "completa" ||
    analisis.gaps.length === 0
  ) {
    return ronda1;
  }

  // ── Guard de timeout ──────────────────────────────────────────────────────
  // Si la ronda 1 + análisis ya consumieron más del 80% del tiempo disponible,
  // omitir la ronda 2 para no arriesgar un timeout 504 en Vercel.
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > timeoutMs * 0.8) {
    console.warn(
      `[agentic-retriever] Omitiendo ronda 2: ${elapsedMs}ms > ${timeoutMs * 0.8}ms (80% del timeout). Retornando ronda 1.`
    );
    return ronda1;
  }

  // ── Ronda 2: búsquedas adicionales por cada gap ───────────────────────────
  const chunksGaps: ChunkRecuperado[] = [];

  const busquedasGap = analisis.gaps.map((gap) =>
    recuperarMultiQuery(
      gap.query,
      10, // topK por gap — se deduplicará al hacer el merge final
      plan.tiposNorma.length > 0 ? plan.tiposNorma : null,
      plan.filtrarSoloVigentes
    ).catch(() => [] as ChunkRecuperado[]) // falla silenciosa por gap individual
  );

  try {
    const resultadosGaps = await Promise.all(busquedasGap);
    for (const resultado of resultadosGaps) {
      chunksGaps.push(...resultado);
    }
  } catch {
    // Si Promise.all falla (no debería dado los .catch individuales), retornar ronda1
    return ronda1;
  }

  // ── Merge y dedup ─────────────────────────────────────────────────────────
  // ronda1 tiene prioridad; se añaden chunks de gaps que no estén ya presentes
  const vistos = new Set<string>(ronda1.map((c) => c.id));
  const merged: ChunkRecuperado[] = [...ronda1];

  for (const chunk of chunksGaps) {
    if (merged.length >= maxChunksFinal) break;
    if (!vistos.has(chunk.id)) {
      vistos.add(chunk.id);
      merged.push(chunk);
    }
  }

  return merged.slice(0, maxChunksFinal);
}
