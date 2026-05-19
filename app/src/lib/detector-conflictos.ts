/**
 * detector-conflictos.ts — Identifica chunks restrictivos en el paquete recuperado.
 *
 * Escanea el texto de los chunks buscando patrones de prohibición o improcedencia
 * ("no procede", "improcedencia", "se excluye", etc.) y los promueve al sintetizador
 * como contexto especial. Esto previene que el LLM ignore una norma especial
 * restrictiva escondida entre normas generales permisivas.
 */

import type { ChunkRecuperado } from "./rag";

/**
 * Patrones que marcan un chunk como "restrictivo".
 * Calibrados sobre lenguaje jurídico chileno típico (DDU, LGUC, OGUC, dictámenes CGR).
 */
const PATRONES_RESTRICTIVOS: RegExp[] = [
  /\bno\s+procede\b/i,
  /\bimprocedencia\b/i,
  /\bimprocedente\b/i,
  /\bno\s+es\s+posible\b/i,
  /\bno\s+puede\s+acogerse\b/i,
  /\bno\s+podr[aá]\b/i,
  /\bse\s+excluye\b/i,
  /\bquedar[aá]\s+prohibid[oa]\b/i,
  /\bprohibici[oó]n\b/i,
  /\bno\s+se\s+permitir[aá]\b/i,
  /\bdeja\s+sin\s+efecto\b/i,
  /\bderogad[oa]\b/i,
  /\bcontravien[ea]\b/i,
  /\bdesplaza\s+la\s+norma\b/i,
];

/**
 * Patrones que indican que un chunk es una EXCEPCIÓN al régimen general (lo opuesto
 * a una restricción). Útil para distinguir entre "no procede" puro y "no procede SALVO".
 */
const PATRONES_EXCEPCION: RegExp[] = [
  /\bsalvo\b.{0,80}\b(que|cuando|si)\b/i,
  /\bexcepto\b/i,
  /\bsin\s+perjuicio\s+de\b/i,
  /\ba\s+menos\s+que\b/i,
];

export interface ResultadoDetector {
  /** Chunks que contienen lenguaje restrictivo (improcedencia, prohibición, etc.) */
  restrictivos: ChunkRecuperado[];
  /** Chunks con lenguaje de excepción ("salvo que...", "excepto cuando...") */
  excepciones: ChunkRecuperado[];
  /** Chunks que no son restrictivos ni excepciones — base general */
  generales: ChunkRecuperado[];
  /** True si hay al menos 1 chunk restrictivo */
  hayConflicto: boolean;
  /** Patrones específicos encontrados (para debug y mensaje al LLM) */
  patronesDetectados: Array<{
    chunkId: string;
    norma: string;
    patron: string;
    fragmento: string;
  }>;
}

/**
 * Escanea los chunks buscando lenguaje restrictivo.
 */
export function detectarRestricciones(chunks: ChunkRecuperado[]): ResultadoDetector {
  const restrictivos: ChunkRecuperado[] = [];
  const excepciones: ChunkRecuperado[] = [];
  const generales: ChunkRecuperado[] = [];
  const patronesDetectados: ResultadoDetector["patronesDetectados"] = [];

  for (const chunk of chunks) {
    let esRestrictivo = false;
    let esExcepcion = false;

    // Buscar patrones restrictivos
    for (const patron of PATRONES_RESTRICTIVOS) {
      const match = chunk.texto.match(patron);
      if (match) {
        esRestrictivo = true;
        const idx = chunk.texto.toLowerCase().indexOf(match[0].toLowerCase());
        const fragmento = chunk.texto.slice(Math.max(0, idx - 60), idx + match[0].length + 100);
        patronesDetectados.push({
          chunkId: chunk.id,
          norma: `${chunk.norma_tipo} ${chunk.norma_numero}`,
          patron: match[0],
          fragmento: fragmento.trim(),
        });
        break;
      }
    }

    // Buscar patrones de excepción (si ya es restrictivo, también revisar)
    for (const patron of PATRONES_EXCEPCION) {
      if (patron.test(chunk.texto)) {
        esExcepcion = true;
        break;
      }
    }

    if (esRestrictivo) restrictivos.push(chunk);
    else if (esExcepcion) excepciones.push(chunk);
    else generales.push(chunk);
  }

  return {
    restrictivos,
    excepciones,
    generales,
    hayConflicto: restrictivos.length > 0,
    patronesDetectados,
  };
}

/**
 * Formatea el resultado del detector como bloque de prompt para el sintetizador.
 * Solo retorna texto si hay restricciones detectadas; vacío en caso contrario.
 */
export function formatearRestricciones(resultado: ResultadoDetector): string {
  if (!resultado.hayConflicto) return "";

  const restrictivosBlock = resultado.patronesDetectados
    .slice(0, 5) // limitar a 5 para no saturar el prompt
    .map(
      (p, i) =>
        `[R${i + 1}] ${p.norma} — patrón "${p.patron}":\n   "...${p.fragmento.slice(0, 250)}..."`
    )
    .join("\n\n");

  const excepcionesInfo =
    resultado.excepciones.length > 0
      ? `\n\nNOTA: Se detectaron ${resultado.excepciones.length} chunk(s) con lenguaje de EXCEPCIÓN ("salvo que", "excepto"). ` +
        `Estos pueden modular las restricciones anteriores — debes leerlos con cuidado antes de aplicar la regla restrictiva.`
      : "";

  return `
⚠️ NORMAS RESTRICTIVAS DETECTADAS EN EL CONTEXTO:
Los siguientes fragmentos contienen lenguaje de prohibición, improcedencia o derogación.
La conclusión debe respetarlos. NO puedes ignorarlos para responder según una regla general.

${restrictivosBlock}${excepcionesInfo}

INSTRUCCIÓN: si tu respuesta concluyera afirmativamente sobre la procedencia, debes
PRIMERO explicar por qué los fragmentos restrictivos anteriores NO aplican al caso
(citando literalmente la excepción) o RECONOCER que la procedencia está sujeta a
ellos. No omitas estas normas.
`;
}
