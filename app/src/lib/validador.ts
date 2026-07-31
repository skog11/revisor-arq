/**
 * validador.ts — validarConsistencia + verificarCoherenciaRestrictiva
 * Valida que la respuesta generada cumpla los guardrails mínimos,
 * que los artículos citados estén respaldados en el corpus recuperado,
 * y que las conclusiones no contradigan normas restrictivas detectadas.
 */

import { type ChunkRecuperado } from "./rag";
import { type ResultadoDetector } from "./detector-conflictos";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ResultadoValidacion {
  valida: boolean;
  motivo?: string;
  advertencias: string[];
  notasAdicionales: string;
}

export interface CitaNormativaDetectada {
  articulo: string;
  tipo?: string;
}

/**
 * Normaliza la clave de un artículo para comparar citas y metadatos del corpus.
 * Las fuentes históricas alternan entre `5.1.1`, `5.1.1.` y `5.1.1º`; esas
 * variaciones tipográficas no deben convertir una cita respaldada en un error.
 */
export function normalizarArticulo(articulo?: string | null): string {
  return (articulo ?? "").replace(/[°º]/g, "").replace(/\.+$/, "").trim();
}

/** Extrae referencias que pueden solicitarse al corpus antes de invalidar un borrador. */
export function extraerCitasNormativas(respuesta: string): CitaNormativaDetectada[] {
  const regex = /\b(?:art[íi]culo|art\.)\s*([\d.]+[°º]?)(?:\s*(?:de(?:\s+la|\s+el)?|del)?\s*(LGUC|OGUC|DDU|LEY|DS|DFL|DL)\b)?/gi;
  const citas = new Map<string, CitaNormativaDetectada>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(respuesta)) !== null) {
    const articulo = normalizarArticulo(match[1]);
    // Un punto de cierre tras la palabra “artículo” no es una cita. Exigir al
    // menos un dígito evita bloquear respuestas por la secuencia “artículo.”.
    if (!/\d/.test(articulo)) continue;
    const tipo = match[2]?.toUpperCase();
    citas.set(`${tipo ?? "sin-tipo"}:${articulo}`, { articulo, tipo });
  }
  return [...citas.values()];
}

// ─── validarConsistencia ──────────────────────────────────────────────────────

export function validarConsistencia(
  respuesta: string,
  chunks: ChunkRecuperado[]
): ResultadoValidacion {
  // 1. Respuesta demasiado corta
  if (respuesta.trim().length < 50) {
    return { valida: false, motivo: "Respuesta demasiado corta", advertencias: [], notasAdicionales: "" };
  }

  // 2. Verificar disclaimer obligatorio
  const tieneDisclaimer =
    respuesta.includes("Aviso legal") ||
    respuesta.includes("asesoría jurídica") ||
    respuesta.includes("profesional habilitado");
  if (!tieneDisclaimer) {
    return { valida: false, motivo: "Falta disclaimer legal", advertencias: [], notasAdicionales: "" };
  }

  // 3. Encontrar todos los artículos citados y, cuando se explicita, su norma.
  // Un mismo número de artículo existe en múltiples cuerpos normativos: verificar
  // solo el número permite atribuir erróneamente un artículo de OGUC a la LGUC.
  const citasNoVerificadas = new Set<string>();
  const regexArticulos = /\b(?:art[íi]culo|art\.)\s*([\d.]+[°º]?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regexArticulos.exec(respuesta)) !== null) {
    const citado = normalizarArticulo(match[1]);
    // Evitar falsos positivos de puntuación (p. ej. “el artículo.”).
    if (!/\d/.test(citado)) continue;
    const textoPosterior = respuesta.slice(regexArticulos.lastIndex, regexArticulos.lastIndex + 48);
    const normaMatch = textoPosterior.match(/^\s*(?:de(?:\s+la|\s+el)?|del)?\s*(LGUC|OGUC|DDU|LEY|DS|DFL|DL)\b/i);
    const normaCitada = normaMatch?.[1]?.toUpperCase();
    const existeEnContexto = chunks.some((chunk) => {
      const articuloChunk = normalizarArticulo(chunk.articulo);
      const tipoChunk = chunk.norma_tipo.toUpperCase();
      const tipoCompatible = !normaCitada || tipoChunk === normaCitada ||
        // "Ley General de Urbanismo y Construcciones" suele abreviarse como
        // "Ley" en una cita formal, aunque su tipo de corpus sea LGUC.
        (normaCitada === "LEY" && tipoChunk === "LGUC");
      return articuloChunk === citado && tipoCompatible;
    });

    if (!existeEnContexto) {
      citasNoVerificadas.add(normaCitada ? `${normaCitada} Art. ${citado}` : `Art. ${citado}`);
    }
  }

  // Las fuentes PDF alternan saltos de línea, guiones y comillas tipográficas.
  // Se normaliza puntuación para no rechazar un literal correcto solo por formato.
  const normalizarTexto = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const regexCitasTextuales = /["“]([^"”]{12,})["”]/g;
  let citaTextual: RegExpExecArray | null;
  while ((citaTextual = regexCitasTextuales.exec(respuesta)) !== null) {
    // Una elipsis representa una omisión explícita: cada tramo debe existir en
    // alguna fuente, sin exigir que estén unidos en el PDF.
    const tramos = citaTextual[1]
      .split(/(?:\.{3}|…)/)
      .map(normalizarTexto)
      .filter((tramo) => tramo.length >= 8);
    const citaRespaldada = tramos.length > 0 && tramos.every((tramo) =>
      chunks.some((chunk) => normalizarTexto(chunk.texto).includes(tramo))
    );
    if (!citaRespaldada) {
      citasNoVerificadas.add(`Cita textual “${citaTextual[1].slice(0, 48)}”`);
    }
  }

  const advertencias = Array.from(citasNoVerificadas).map(
    (cita) => `${cita} citado en la respuesta no está respaldado por la misma norma y artículo recuperados — verificar en BCN`
  );

  // 5. Construir notasAdicionales
  const notasAdicionales =
    advertencias.length > 0
      ? `\n\n> 🔍 **Nota de verificación automática**: ${advertencias.length} artículo(s) citado(s) no pudieron verificarse en el corpus local. Confirma en BCN: www.bcn.cl`
      : "";

  if (advertencias.length > 0) {
    return { valida: false, motivo: `Citas no verificadas: ${Array.from(citasNoVerificadas).join(", ")}`, advertencias, notasAdicionales };
  }

  return { valida: true, advertencias, notasAdicionales };
}

// ─── Verificador de coherencia restrictiva (Fase 3) ───────────────────────────

/**
 * Patrones de conclusión afirmativa/permisiva en la respuesta del LLM.
 * Todos llevan el prefijo "sí" o "sí," para minimizar falsos positivos:
 * p.ej. "Para que sea posible..." NO activa esto, pero "Sí es posible" SÍ.
 */
const PATRONES_PERMISIVOS: RegExp[] = [
  /\bsí[,]?\s+es\s+posible\b/i,           // "Sí es posible", "Sí, es posible"
  /\bsí[,]?\s+puede\b/i,                   // "Sí puede acogerse", "Sí, puede..."
  /\bsí[,]?\s+procede\b/i,                 // "Sí procede"
  /\bsí[,]?\s+se\s+puede\b/i,              // "Sí se puede"
  /\bsí[,]?\s+es\s+factible\b/i,           // "Sí es factible"
  /\bno\s+existe\s+impedimento\b/i,         // "No existe impedimento"
  /\bno\s+hay\s+impedimento\b/i,            // "No hay impedimento"
];

export interface ResultadoCoherencia {
  hayContradiccion: boolean;
  /** Bloque de advertencia a añadir al final de la respuesta (ya formateado en Markdown) */
  advertencia?: string;
}

/**
 * Verifica que la respuesta generada no contradiga normas restrictivas detectadas
 * en los chunks de contexto.
 *
 * Solo se activa si:
 *   1. Los chunks contienen lenguaje restrictivo (`restricciones.hayConflicto = true`)
 *   2. La respuesta generada contiene lenguaje afirmativo/permisivo específico
 *
 * Cuando hay contradicción, retorna un bloque de advertencia en Markdown para
 * añadir al final del stream sin modificar la respuesta principal.
 *
 * Diseño conservador: si hay duda, NO activa la advertencia (mejor falso negativo
 * que advertir innecesariamente en respuestas correctas).
 */
export function verificarCoherenciaRestrictiva(
  respuesta: string,
  restricciones: ResultadoDetector
): ResultadoCoherencia {
  // Nada restrictivo en el corpus → no hay nada que verificar
  if (!restricciones.hayConflicto) return { hayContradiccion: false };

  // Buscar lenguaje permisivo en la respuesta
  const patronActivo = PATRONES_PERMISIVOS.find((p) => p.test(respuesta));
  if (!patronActivo) return { hayContradiccion: false };

  // Construir lista de normas restrictivas encontradas (máx. 3 para la advertencia)
  const normasRestrictivas = [
    ...new Set(
      restricciones.patronesDetectados.slice(0, 3).map(
        (p) => `${p.norma} ("${p.patron}")`
      )
    ),
  ].join("; ");

  const advertencia = [
    "",
    "",
    "> ⚠️ **Verificación automática de coherencia**: Esta respuesta contiene lenguaje afirmativo,",
    `> pero el corpus recuperado incluye disposiciones restrictivas: ${normasRestrictivas}.`,
    "> Antes de actuar sobre esta conclusión, confirma directamente con la DOM o autoridad competente.",
  ].join("\n");

  return { hayContradiccion: true, advertencia };
}
