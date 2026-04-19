/**
 * Parser para LGUC (DFL-458) y OGUC (DS-47).
 * Detecta artículos con regex, preserva jerarquía Título/Capítulo.
 * Extrae fecha de vigencia del artículo cuando está disponible en el texto.
 */
import { readFileSync } from "fs";
import type { ParsedArticulo, ParsedNorma, TipoNorma } from "../types";

// ─── Regexes ─────────────────────────────────────────────────────────────────

// LGUC: "Artículo 116°.-" o "Artículo 2 bis.-"
const RE_ART_LGUC = /^\s{0,8}Artículo\s+(\d+\s*(?:bis|ter|quáter)?)[°º]?\.?-?\s*/m;

// OGUC: "Artículo 2.6.3." (jerarquía por puntos)
const RE_ART_OGUC = /^\s{0,8}Artículo\s+(\d+\.\d+\.\d+)[°º]?\.?\s*/m;

// Jerarquía LGUC
const RE_TITULO = /^\s{0,8}T[IÍ]TULO\s+((?:I{1,3}|IV|V{1,3}|VI{1,4}|IX|X|\d+)[°\s].*?)$/im;
const RE_CAPITULO = /^\s{0,8}CAP[IÍ]TULO\s+((?:I{1,3}|IV|V{1,3}|VI{1,4}|IX|X|\d+)[°\s].*?)$/im;

// Fecha de vigencia en notas al margen: "D.O. DD.MM.YYYY"
const RE_DO_DATE = /D\.O\.\s+(\d{2}\.\d{2}\.\d{4})/g;

// Encabezados del PDF de BCN a eliminar
const RE_BCN_HEADER = /^Decreto \d+, VIVIENDA \(\d+\)\s*\nBiblioteca del Congreso Nacional.*?\npágina \d+ de \d+\s*$/gm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanText(t: string): string {
  return t
    .replace(RE_BCN_HEADER, "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function parseDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Extrae la última fecha D.O. mencionada en un bloque de texto */
function extractLastDoDate(text: string): string | undefined {
  const matches = [...text.matchAll(RE_DO_DATE)];
  if (!matches.length) return undefined;
  return parseDate(matches[matches.length - 1][1]);
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseLGUC(texto: string, urlFuente: string): ParsedNorma {
  const clean = cleanText(texto);
  const lines = clean.split("\n");

  const articulos: ParsedArticulo[] = [];
  let currentTitulo = "";
  let currentCapitulo = "";
  let currentArt: { numero: string; titulo?: string; lines: string[] } | null = null;
  let orden = 0;

  const flushArticulo = () => {
    if (!currentArt) return;
    const artText = currentArt.lines.join("\n").trim();
    if (artText.length < 20) return;

    articulos.push({
      numero: currentArt.numero.trim().replace(/\s+/g, " "),
      titulo: currentArt.titulo,
      texto: artText,
      jerarquia: {
        titulo: currentTitulo || undefined,
        capitulo: currentCapitulo || undefined,
      },
      fecha_vigencia_desde: extractLastDoDate(artText),
      orden: orden++,
    });
    currentArt = null;
  };

  for (const line of lines) {
    const mTit = line.match(RE_TITULO);
    if (mTit) {
      flushArticulo();
      currentTitulo = `TÍTULO ${mTit[1].trim()}`;
      currentCapitulo = "";
      continue;
    }

    const mCap = line.match(RE_CAPITULO);
    if (mCap) {
      flushArticulo();
      currentCapitulo = `CAPÍTULO ${mCap[1].trim()}`;
      continue;
    }

    const mArt = line.match(RE_ART_LGUC);
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

  return {
    tipo: "LGUC",
    numero: "DFL-458",
    titulo: "Ley General de Urbanismo y Construcciones",
    url_fuente: urlFuente,
    fecha_publicacion: "1976-04-13",
    articulos,
  };
}

function parseOGUC(texto: string, urlFuente: string): ParsedNorma {
  const clean = cleanText(texto);
  const lines = clean.split("\n");

  const articulos: ParsedArticulo[] = [];
  let currentTitulo = "";
  let currentCapitulo = "";
  let currentArt: { numero: string; lines: string[] } | null = null;
  let orden = 0;

  const flushArticulo = () => {
    if (!currentArt) return;
    const artText = currentArt.lines.join("\n").trim();
    if (artText.length < 20) return;

    articulos.push({
      numero: currentArt.numero,
      texto: artText,
      jerarquia: {
        titulo: currentTitulo || undefined,
        capitulo: currentCapitulo || undefined,
      },
      fecha_vigencia_desde: extractLastDoDate(artText),
      orden: orden++,
    });
    currentArt = null;
  };

  for (const line of lines) {
    const mTit = line.match(/^\s{0,8}T[IÍ]TULO\s+(\d+)/i);
    if (mTit) {
      flushArticulo();
      currentTitulo = `TÍTULO ${mTit[1]}`;
      continue;
    }

    const mCap = line.match(/^\s{0,8}CAP[IÍ]TULO\s+(\d+)/i);
    if (mCap) {
      flushArticulo();
      currentCapitulo = `CAPÍTULO ${mCap[1]}`;
      continue;
    }

    const mArt = line.match(RE_ART_OGUC);
    if (mArt) {
      flushArticulo();
      currentArt = { numero: mArt[1], lines: [line] };
      continue;
    }

    if (currentArt) {
      currentArt.lines.push(line);
    }
  }
  flushArticulo();

  return {
    tipo: "OGUC",
    numero: "DS-47",
    titulo: "Ordenanza General de Urbanismo y Construcciones",
    url_fuente: urlFuente,
    fecha_publicacion: "1992-06-05",
    articulos,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function parseLGUCFile(filePath: string, urlFuente: string): ParsedNorma {
  const texto = readFileSync(filePath, "utf-8");
  return parseLGUC(texto, urlFuente);
}

export function parseOGUCFile(filePath: string, urlFuente: string): ParsedNorma {
  const texto = readFileSync(filePath, "utf-8");
  return parseOGUC(texto, urlFuente);
}
