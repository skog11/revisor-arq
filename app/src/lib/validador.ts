/**
 * validador.ts — validarConsistencia
 * Valida que la respuesta generada cumpla los guardrails mínimos
 * y que los artículos citados estén respaldados en el corpus recuperado.
 */

import { type ChunkRecuperado } from "./rag";

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
