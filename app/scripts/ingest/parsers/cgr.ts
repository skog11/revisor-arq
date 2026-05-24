/**
 * Parser para dictámenes de la Contraloría General de la República (CGR).
 *
 * Formato estándar de un dictamen CGR:
 *   DICTAMEN N° XXXXX - FECHA
 *   En [fecha], esta Contraloría ha recibido [antecedentes]...
 *   [Cuerpo: párrafos numerados o continuos con análisis jurídico]
 *   En consecuencia, [conclusión].
 *   [Firma: Contralor General]
 *
 * Los dictámenes se ingresan como "artículos" donde cada bloque temático
 * es un artículo, facilitando la recuperación semántica por tema.
 */

import { readFileSync } from "fs";
import type { ParsedArticulo, ParsedNorma } from "../types";

// ─── Regexes ─────────────────────────────────────────────────────────────────

// Encabezado de dictamen
const RE_DICTAMEN_NUM =
  /DICTAMEN\s+N[°º]?\s*(\d+[\w-]*)\s*(?:[-–]\s*(\d{4}))?/i;

// Secciones típicas de un dictamen CGR
const RE_SECCION_ANTECEDENTES =
  /^(?:I\.?\s*)?(?:ANTECEDENTES?|Se han presentado|Han requerido|Esta Contraloría ha recibido)/im;
const RE_SECCION_ANALISIS =
  /^(?:II\.?\s*)?(?:AN[ÁA]LISIS|SOBRE EL FONDO|AL RESPECTO|Sobre el particular)/im;
const RE_SECCION_CONCLUSION =
  /^(?:III\.?\s*)?(?:CONCLUSI[ÓO]N|En consecuencia|Por lo expuesto|En mérito)/im;

// Párrafos numerados (1., 2., 1°, etc.)
const RE_PARRAFO_NUM = /^\s*(\d+)[.°]\s+/m;

// Firma del Contralor (marca fin del cuerpo)
const RE_FIRMA =
  /(?:RAMIRO MENDOZA|JORGE BERMÚDEZ|DORVAL KÜHNE|OSVALDO ITURRIAGA|Contralor General)/im;

// Encabezados de página a eliminar
const RE_HEADER_PAGE =
  /^(?:Contraloría General de la República|www\.contraloria\.cl|República de Chile).*$/gm;
const RE_PAGE_NUM = /^\s*[-–]\s*\d+\s*[-–]\s*$/gm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function limpiarTexto(raw: string): string {
  return raw
    .replace(RE_HEADER_PAGE, "")
    .replace(RE_PAGE_NUM, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Divide el texto del dictamen en bloques temáticos.
 * Estrategia: detectar secciones estándar (Antecedentes / Análisis / Conclusión)
 * y, dentro de cada una, agrupar párrafos de ≥300 chars en un único "artículo".
 * Si el texto no tiene secciones claras, usa bloques de 600-800 chars.
 */
function segmentarDictamen(texto: string, numeroDictamen: string): ParsedArticulo[] {
  const articulos: ParsedArticulo[] = [];
  let orden = 0;

  // Intentar detectar secciones estructuradas
  const seccionesMatch = detectarSecciones(texto);

  if (seccionesMatch.length >= 2) {
    for (const sec of seccionesMatch) {
      const bloques = dividirEnBloques(sec.contenido, 700);
      for (const bloque of bloques) {
        if (bloque.trim().length < 80) continue;
        articulos.push({
          numero: `${numeroDictamen}-${sec.nombre.toLowerCase().replace(/\s+/g, "-")}-${orden + 1}`,
          titulo: sec.nombre,
          texto: bloque.trim(),
          jerarquia: { titulo: `Dictamen N° ${numeroDictamen}` },
          orden: orden++,
        });
      }
    }
  } else {
    // Sin secciones detectables: dividir en bloques de tamaño fijo
    const bloques = dividirEnBloques(texto, 700);
    for (const bloque of bloques) {
      if (bloque.trim().length < 80) continue;
      articulos.push({
        numero: `${numeroDictamen}-${orden + 1}`,
        texto: bloque.trim(),
        jerarquia: { titulo: `Dictamen N° ${numeroDictamen}` },
        orden: orden++,
      });
    }
  }

  return articulos;
}

interface Seccion {
  nombre: string;
  contenido: string;
}

function detectarSecciones(texto: string): Seccion[] {
  const secciones: Seccion[] = [];

  const indices: { nombre: string; idx: number }[] = [];

  const mAnt = RE_SECCION_ANTECEDENTES.exec(texto);
  if (mAnt) indices.push({ nombre: "Antecedentes", idx: mAnt.index });

  const mAna = RE_SECCION_ANALISIS.exec(texto);
  if (mAna) indices.push({ nombre: "Análisis", idx: mAna.index });

  const mCon = RE_SECCION_CONCLUSION.exec(texto);
  if (mCon) indices.push({ nombre: "Conclusión", idx: mCon.index });

  // Ordenar por posición
  indices.sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < indices.length; i++) {
    const inicio = indices[i].idx;
    const fin = i + 1 < indices.length ? indices[i + 1].idx : texto.length;
    const contenido = texto.slice(inicio, fin).trim();
    if (contenido.length > 50) {
      secciones.push({ nombre: indices[i].nombre, contenido });
    }
  }

  // Si no se detectó nada, tratar el texto completo como cuerpo único
  if (secciones.length === 0) {
    secciones.push({ nombre: "Contenido", contenido: texto });
  }

  return secciones;
}

function dividirEnBloques(texto: string, targetChars: number): string[] {
  const parrafos = texto.split(/\n\n+/);
  const bloques: string[] = [];
  let actual = "";

  for (const p of parrafos) {
    const pLimpio = p.trim();
    if (!pLimpio) continue;

    if (actual.length + pLimpio.length < targetChars) {
      actual += (actual ? "\n\n" : "") + pLimpio;
    } else {
      if (actual) bloques.push(actual);
      // Si el párrafo solo supera el target, partirlo por oraciones
      if (pLimpio.length > targetChars * 1.5) {
        const oraciones = pLimpio.split(/(?<=[.!?])\s+/);
        let subActual = "";
        for (const o of oraciones) {
          if (subActual.length + o.length < targetChars) {
            subActual += (subActual ? " " : "") + o;
          } else {
            if (subActual) bloques.push(subActual);
            subActual = o;
          }
        }
        actual = subActual;
      } else {
        actual = pLimpio;
      }
    }
  }
  if (actual) bloques.push(actual);
  return bloques;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseCGRDictamen(
  filePath: string,
  opts: {
    numero: string;   // "8518" o "E14360"
    anio: string;     // "2006"
    titulo?: string;
    urlFuente: string;
  }
): ParsedNorma {
  const raw = readFileSync(filePath, "utf-8");
  const texto = limpiarTexto(raw);

  // Eliminar firma del contralor (no aporta semánticamente)
  const firmaIdx = RE_FIRMA.exec(texto)?.index ?? texto.length;
  const cuerpo = texto.slice(0, firmaIdx).trim();

  // Formato consistente con las claves del manifiesto y motor-reglas: "8518-2006"
  const numeroDictamen = `${opts.numero}-${opts.anio}`;
  const articulos = segmentarDictamen(cuerpo, numeroDictamen);

  // Prefijo descriptivo al primer artículo para mejorar embedding
  if (articulos.length > 0 && opts.titulo) {
    articulos[0].texto = `[Dictamen CGR N° ${numeroDictamen}: ${opts.titulo}]\n\n${articulos[0].texto}`;
  }

  return {
    tipo: "CGR",
    numero: numeroDictamen,
    titulo: opts.titulo ?? `Dictamen CGR N° ${numeroDictamen}`,
    url_fuente: opts.urlFuente,
    articulos,
  };
}
