/**
 * Chunker semántico para artículos legales.
 *
 * Estrategia:
 * - Artículos cortos (≤ MAX_TOKENS): 1 chunk = 1 artículo.
 * - Artículos largos: divide por párrafos con ventana deslizante (solapamiento OVERLAP_TOKENS).
 *   El solapamiento se hace a nivel de oración/párrafo completo, no en medio de palabras.
 *
 * Estimación de tokens: chars / 4 (heurística conservadora para español).
 */
import type { ChunkData, ParsedArticulo, ParsedNorma } from "./types";

const MAX_TOKENS = 600;      // 600 tokens (~2400 chars) — mantiene artículos completos con mayor frecuencia
const OVERLAP_TOKENS = 100;  // Solapamiento proporcional al nuevo tamaño

/** Estima tokens (chars / 4, redondeado arriba). */
function estimarTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Divide un texto en párrafos no vacíos.
 * Si un párrafo supera MAX_TOKENS solo, lo divide por oraciones.
 */
function dividirEnParrafos(texto: string): string[] {
  const parrafos: string[] = [];
  for (const raw of texto.split(/\n{2,}/)) {
    const p = raw.trim();
    if (!p) continue;
    if (estimarTokens(p) <= MAX_TOKENS) {
      parrafos.push(p);
    } else {
      // Dividir párrafo largo por oraciones (punto seguido de espacio o fin de línea)
      const oraciones = p.split(/(?<=[.!?])\s+/);
      let sub = "";
      for (const or of oraciones) {
        if (estimarTokens(sub + " " + or) > MAX_TOKENS && sub) {
          parrafos.push(sub.trim());
          sub = or;
        } else {
          sub = sub ? sub + " " + or : or;
        }
      }
      if (sub.trim()) parrafos.push(sub.trim());
    }
  }
  return parrafos;
}

/**
 * Genera chunks con ventana deslizante sobre una lista de párrafos.
 * Garantiza: cada chunk ≤ MAX_TOKENS, solapamiento ≥ OVERLAP_TOKENS cuando hay >1 chunk.
 */
function chunkearConSolapamiento(parrafos: string[]): string[] {
  if (!parrafos.length) return [];

  // Caso simple: todo cabe en un chunk
  const textoCompleto = parrafos.join("\n\n");
  if (estimarTokens(textoCompleto) <= MAX_TOKENS) {
    return [textoCompleto];
  }

  const chunks: string[] = [];
  let inicio = 0;

  while (inicio < parrafos.length) {
    // Construir chunk desde `inicio` hasta que supere MAX_TOKENS
    let fin = inicio;
    let tokensAcum = 0;
    while (fin < parrafos.length) {
      const t = estimarTokens(parrafos[fin]);
      if (tokensAcum + t > MAX_TOKENS && fin > inicio) break;
      tokensAcum += t;
      fin++;
    }
    // Si un solo párrafo supera MAX_TOKENS, incluirlo igual (ya fue dividido antes)
    if (fin === inicio) fin = inicio + 1;

    chunks.push(parrafos.slice(inicio, fin).join("\n\n"));

    // Calcular cuántos párrafos de solapamiento retroceder
    let solapTokens = 0;
    let retroceso = fin;
    while (retroceso > inicio + 1) {
      retroceso--;
      solapTokens += estimarTokens(parrafos[retroceso]);
      if (solapTokens >= OVERLAP_TOKENS) break;
    }

    inicio = retroceso;

    // Evitar bucle infinito si no avanzamos
    if (inicio >= fin) inicio = fin;
  }

  return chunks;
}

/**
 * Construye el prefijo de jerarquía legible para metadatos.
 */
function jerarquiaLabel(art: ParsedArticulo): string | undefined {
  const partes: string[] = [];
  if (art.jerarquia.titulo) partes.push(art.jerarquia.titulo);
  if (art.jerarquia.capitulo) partes.push(art.jerarquia.capitulo);
  return partes.length ? partes.join(" › ") : undefined;
}

/**
 * Genera todos los ChunkData a partir de una ParsedNorma.
 */
export function chunkearNorma(norma: ParsedNorma): ChunkData[] {
  const chunks: ChunkData[] = [];
  let ordenGlobal = 0;

  for (const art of norma.articulos) {
    const parrafos = dividirEnParrafos(art.texto);
    const textoChunks = chunkearConSolapamiento(parrafos);

    const jerarquia = jerarquiaLabel(art);

    for (let i = 0; i < textoChunks.length; i++) {
      const texto = textoChunks[i];
      const sufijo = textoChunks.length > 1 ? ` (parte ${i + 1}/${textoChunks.length})` : "";

      // Prefijo contextual enriquecido: jerarquía + título del artículo cuando disponible
      const jerarquiaParte = jerarquia ? ` › ${jerarquia}` : "";
      const tituloParte = art.titulo ? `: ${art.titulo}` : "";
      const prefijo = `[${norma.tipo} ${norma.numero}${jerarquiaParte} – Art. ${art.numero}${tituloParte}${sufijo}]\n`;
      const textoFinal = prefijo + texto;

      chunks.push({
        texto: textoFinal,
        tokens: estimarTokens(textoFinal),
        orden: ordenGlobal++,
        metadatos: {
          tipo_norma: norma.tipo,
          numero_norma: norma.numero,
          articulo: art.numero,
          titulo_articulo: art.titulo,
          jerarquia,
          url_fuente: norma.url_fuente,
        },
        fecha_vigencia_desde: art.fecha_vigencia_desde,
        fecha_vigencia_hasta: undefined, // null = vigente
        fuente: norma.url_fuente,
      });
    }
  }

  return chunks;
}
