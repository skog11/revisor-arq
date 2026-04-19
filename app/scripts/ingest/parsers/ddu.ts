/**
 * Parser para DDU (Circulares División de Desarrollo Urbano).
 * Las DDUs tienen estructura más libre que LGUC/OGUC:
 * secciones numeradas (1., 1.1., 2.3.4.) o artículos explícitos.
 * Se segmenta por sección o por bloques de longitud máxima.
 */
import { readFileSync } from "fs";
import type { ParsedArticulo, ParsedNorma, TipoNorma } from "../types";

// ─── Regexes ─────────────────────────────────────────────────────────────────

// Sección numerada: "1.", "1.1.", "2.3.", "3.1.2." al inicio de línea
const RE_SECCION = /^\s{0,6}(\d+(?:\.\d+){0,3})\.\s+(.{3,80}?)(?:\s*$)/m;

// Artículo explícito (algunas DDU los usan): "Artículo 5.-"
const RE_ART = /^\s{0,8}Art[ií]culo\s+(\d+)[°º]?\.?-?\s*/m;

// Fecha D.O.
const RE_DO_DATE = /D\.O\.\s+(\d{2}\.\d{2}\.\d{4})/g;

// Número de DDU en el encabezado del documento
const RE_DDU_NUMERO = /(?:Circular\s+)?DDU[- ]\s*(\d+)/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function extractLastDoDate(text: string): string | undefined {
  const matches = [...text.matchAll(RE_DO_DATE)];
  if (!matches.length) return undefined;
  return parseDate(matches[matches.length - 1][1]);
}

function cleanText(t: string): string {
  return t
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Detecta si el texto tiene secciones numeradas suficientes para usarlas como splits.
 * Umbral: al menos 3 secciones de primer nivel.
 */
function hasSeccionesNumeradas(lines: string[]): boolean {
  let count = 0;
  for (const line of lines) {
    if (/^\s{0,6}\d+\.\s+\S/.test(line)) count++;
    if (count >= 3) return true;
  }
  return false;
}

/**
 * Parseo por secciones numeradas (DDUs estructuradas).
 */
function parsePorSecciones(
  lines: string[],
  tipo: TipoNorma,
  numero: string,
  urlFuente: string,
  fechaPublicacion?: string
): ParsedNorma {
  const articulos: ParsedArticulo[] = [];
  let currentSec: { numero: string; titulo: string; lines: string[] } | null = null;
  let orden = 0;

  const flush = () => {
    if (!currentSec) return;
    const texto = currentSec.lines.join("\n").trim();
    if (texto.length < 30) return;
    articulos.push({
      numero: currentSec.numero,
      titulo: currentSec.titulo,
      texto,
      jerarquia: {},
      fecha_vigencia_desde: extractLastDoDate(texto) ?? fechaPublicacion,
      orden: orden++,
    });
    currentSec = null;
  };

  for (const line of lines) {
    const mSec = line.match(RE_SECCION);
    if (mSec) {
      flush();
      currentSec = {
        numero: mSec[1],
        titulo: mSec[2].trim(),
        lines: [line],
      };
      continue;
    }
    if (currentSec) {
      currentSec.lines.push(line);
    }
  }
  flush();

  return {
    tipo,
    numero,
    titulo: `Circular DDU ${numero}`,
    url_fuente: urlFuente,
    fecha_publicacion: fechaPublicacion,
    articulos,
  };
}

/**
 * Parseo por artículos explícitos.
 */
function parsePorArticulos(
  lines: string[],
  tipo: TipoNorma,
  numero: string,
  urlFuente: string,
  fechaPublicacion?: string
): ParsedNorma {
  const articulos: ParsedArticulo[] = [];
  let currentArt: { numero: string; lines: string[] } | null = null;
  let orden = 0;

  const flush = () => {
    if (!currentArt) return;
    const texto = currentArt.lines.join("\n").trim();
    if (texto.length < 30) return;
    articulos.push({
      numero: currentArt.numero,
      texto,
      jerarquia: {},
      fecha_vigencia_desde: extractLastDoDate(texto) ?? fechaPublicacion,
      orden: orden++,
    });
    currentArt = null;
  };

  for (const line of lines) {
    const mArt = line.match(RE_ART);
    if (mArt) {
      flush();
      currentArt = { numero: mArt[1], lines: [line] };
      continue;
    }
    if (currentArt) {
      currentArt.lines.push(line);
    }
  }
  flush();

  return {
    tipo,
    numero,
    titulo: `Circular DDU ${numero}`,
    url_fuente: urlFuente,
    fecha_publicacion: fechaPublicacion,
    articulos,
  };
}

/**
 * Parseo por bloques de texto (fallback para DDUs sin estructura clara).
 * Divide por párrafos, agrupa hasta ~800 tokens estimados.
 */
function parsePorBloques(
  texto: string,
  tipo: TipoNorma,
  numero: string,
  urlFuente: string,
  fechaPublicacion?: string
): ParsedNorma {
  // Dividir en párrafos no vacíos
  const parrafos = texto.split(/\n{2,}/).filter((p) => p.trim().length > 20);

  const TOKENS_MAX = 700; // ~700 tokens ≈ 2800 chars
  const articulos: ParsedArticulo[] = [];
  let bloque: string[] = [];
  let orden = 0;

  const flush = () => {
    if (!bloque.length) return;
    const artText = bloque.join("\n\n").trim();
    articulos.push({
      numero: `bloque-${orden + 1}`,
      texto: artText,
      jerarquia: {},
      fecha_vigencia_desde: extractLastDoDate(artText) ?? fechaPublicacion,
      orden: orden++,
    });
    bloque = [];
  };

  let tokensActuales = 0;
  for (const p of parrafos) {
    const tokensP = Math.ceil(p.length / 4);
    if (tokensActuales + tokensP > TOKENS_MAX && bloque.length > 0) {
      flush();
      tokensActuales = 0;
    }
    bloque.push(p.trim());
    tokensActuales += tokensP;
  }
  flush();

  return {
    tipo,
    numero,
    titulo: `Circular DDU ${numero}`,
    url_fuente: urlFuente,
    fecha_publicacion: fechaPublicacion,
    articulos,
  };
}

// ─── Función principal ────────────────────────────────────────────────────────

function parseDDU(
  texto: string,
  urlFuente: string,
  key: string,
  tipo: TipoNorma = "DDU"
): ParsedNorma {
  const clean = cleanText(texto);
  const lines = clean.split("\n");

  // Extraer número de la key (DDU-227 → "227", DDU-ESP-001-07 → "001-07")
  const numero = key.replace(/^DDU-(?:ESP-)?/, "");

  // Detectar fecha de publicación desde el texto completo
  const fechaPublicacion = extractLastDoDate(clean.slice(0, 3000));

  // Elegir estrategia de parseo
  if (hasSeccionesNumeradas(lines)) {
    const result = parsePorSecciones(lines, tipo, numero, urlFuente, fechaPublicacion);
    if (result.articulos.length >= 2) return result;
  }

  // Intentar por artículos explícitos
  const hasArticulos = lines.some((l) => RE_ART.test(l));
  if (hasArticulos) {
    const result = parsePorArticulos(lines, tipo, numero, urlFuente, fechaPublicacion);
    if (result.articulos.length >= 1) return result;
  }

  // Fallback: bloques
  return parsePorBloques(clean, tipo, numero, urlFuente, fechaPublicacion);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function parseDDUFile(
  filePath: string,
  urlFuente: string,
  key: string,
  tipo: TipoNorma = "DDU"
): ParsedNorma {
  const texto = readFileSync(filePath, "utf-8");
  return parseDDU(texto, urlFuente, key, tipo);
}
