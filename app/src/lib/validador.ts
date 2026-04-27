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

  // 4. Encontrar todos los artículos citados en la respuesta
  const advertencias: string[] = [];
  const regexArticulos = /\bart[íi]culo\s+([\d.]+[°º]?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regexArticulos.exec(respuesta)) !== null) {
    const citado = match[1].replace(/[°º]/g, "").trim();
    if (!articulosEnContexto.has(citado)) {
      // Evitar duplicados en advertencias
      const advertencia = `Art. ${match[1]} citado en la respuesta no está en el contexto recuperado — verificar en BCN`;
      if (!advertencias.includes(advertencia)) {
        advertencias.push(advertencia);
      }
    }
  }

  // 5. Construir notasAdicionales
  const notasAdicionales =
    advertencias.length > 0
      ? `\n\n> 🔍 **Nota de verificación automática**: ${advertencias.length} artículo(s) citado(s) no pudieron verificarse en el corpus local. Confirma en BCN: www.bcn.cl`
      : "";

  return { valida: true, advertencias, notasAdicionales };
}
