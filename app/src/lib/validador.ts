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

  // 3. Construir Set de artículos disponibles en los chunks recuperados
  const articulosEnContexto = new Set<string>();
  for (const chunk of chunks) {
    if (chunk.articulo) {
      // Normalizar: quitar signos de ordinales (° º) para comparar
      const normalizado = chunk.articulo.replace(/[°º]/g, "").trim();
      articulosEnContexto.add(normalizado);
    }
  }

  // 4. Encontrar todos los artículos citados en la respuesta.
  // El regex captura tanto "artículo 5.3.1" como "Art. 5.3.1" (abreviatura común en textos legales).
  const articulosNoVerificados = new Set<string>();
  const regexArticulos = /\b(?:art[íi]culo|art\.)\s*([\d.]+[°º]?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regexArticulos.exec(respuesta)) !== null) {
    const citado = match[1].replace(/[°º]/g, "").trim();
    if (!articulosEnContexto.has(citado)) {
      articulosNoVerificados.add(citado); // Set evita duplicados automáticamente
    }
  }

  const advertencias = Array.from(articulosNoVerificados).map(
    (art) => `Art. ${art} citado en la respuesta no está en el contexto recuperado — verificar en BCN`
  );

  // 5. Construir notasAdicionales
  const notasAdicionales =
    advertencias.length > 0
      ? `\n\n> 🔍 **Nota de verificación automática**: ${advertencias.length} artículo(s) citado(s) no pudieron verificarse en el corpus local. Confirma en BCN: www.bcn.cl`
      : "";

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
