/**
 * Parser genérico para leyes, DFL, DL y DS chilenos en formato estándar BCN.
 *
 * Formato esperado: texto extraído de PDF BCN con artículos en el patrón:
 *   "Artículo 1°.-  Texto..."
 *   "Artículo 2 bis.-  Texto..."
 *   "TITULO I - Disposiciones Generales"
 *   "CAPITULO II - ..."
 *   "Párrafo 1°"
 *
 * Se usa como fallback si el texto no sigue el formato exacto de LGUC/OGUC.
 */

import { readFileSync } from "fs";
import type { ParsedArticulo, ParsedNorma, TipoNorma } from "../types";

// ─── Regexes ─────────────────────────────────────────────────────────────────

// Artículo standard: "Artículo 5°.-", "Artículo 2 bis.-", "Art. 5.-"
const RE_ART = /^\s{0,8}Art[íi]culo\s+(\d+\s*(?:bis|ter|qu[áa]ter|quinquies)?)\s*[°º]?\s*\.?-?\s*/im;

// Jerarquía
const RE_TITULO = /^\s{0,8}T[ÍI]TULO\s+((?:[IVX]+|\d+)[°\s].*?)$/im;
const RE_CAPITULO = /^\s{0,8}CAP[ÍI]TULO\s+((?:[IVX]+|\d+)[°\s].*?)$/im;
const RE_PARRAFO = /^\s{0,8}P[ÁA]RRAFO\s+(\d+[°\s].*?)$/im;

// Encabezados de página BCN (a eliminar)
const RE_BCN_HEADER = /^(?:Ley Chile|Biblioteca del Congreso Nacional).*$/gm;
const RE_PAGE_NUM = /^\s*\d+\s*$/gm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanText(t: string): string {
  return t
    .replace(RE_BCN_HEADER, "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(RE_PAGE_NUM, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export interface LeyMetadata {
  tipo: TipoNorma;
  numero: string;      // "19300", "725", "2695", "47"
  titulo: string;
  url_fuente: string;
  fecha_publicacion?: string;
}

export function parseLey(
  filePath: string,
  meta: LeyMetadata
): ParsedNorma {
  const raw = readFileSync(filePath, "utf-8");
  const clean = cleanText(raw);
  const lines = clean.split("\n");

  const articulos: ParsedArticulo[] = [];
  let currentTitulo = "";
  let currentCapitulo = "";
  let currentParrafo = "";
  let currentArt: { numero: string; lines: string[] } | null = null;
  let orden = 0;

  const flushArticulo = () => {
    if (!currentArt) return;
    const artText = currentArt.lines.join("\n").trim();
    if (artText.length < 15) return;

    articulos.push({
      numero: currentArt.numero.trim().replace(/\s+/g, " "),
      texto: artText,
      jerarquia: {
        titulo: currentTitulo || undefined,
        capitulo: currentCapitulo || currentParrafo || undefined,
      },
      orden: orden++,
    });
    currentArt = null;
  };

  for (const line of lines) {
    // Jerarquía
    const mTit = line.match(RE_TITULO);
    if (mTit) {
      flushArticulo();
      currentTitulo = `TÍTULO ${mTit[1].trim()}`;
      currentCapitulo = "";
      currentParrafo = "";
      continue;
    }

    const mCap = line.match(RE_CAPITULO);
    if (mCap) {
      flushArticulo();
      currentCapitulo = `CAPÍTULO ${mCap[1].trim()}`;
      currentParrafo = "";
      continue;
    }

    const mPar = line.match(RE_PARRAFO);
    if (mPar) {
      flushArticulo();
      currentParrafo = `PÁRRAFO ${mPar[1].trim()}`;
      continue;
    }

    // Artículo
    const mArt = line.match(RE_ART);
    if (mArt) {
      flushArticulo();
      currentArt = {
        numero: mArt[1],
        lines: [line],
      };
      continue;
    }

    if (currentArt) {
      currentArt.lines.push(line);
    }
  }
  flushArticulo();

  // Fallback: si no se detectó ningún artículo, chunking por párrafos largos
  if (articulos.length === 0) {
    const parrafos = clean.split(/\n{2,}/);
    let idx = 0;
    for (const p of parrafos) {
      const t = p.trim();
      if (t.length > 100) {
        articulos.push({
          numero: `p${idx + 1}`,
          texto: t,
          jerarquia: {},
          orden: idx,
        });
        idx++;
      }
    }
  }

  return {
    tipo: meta.tipo,
    numero: meta.numero,
    titulo: meta.titulo,
    url_fuente: meta.url_fuente,
    fecha_publicacion: meta.fecha_publicacion,
    articulos,
  };
}
