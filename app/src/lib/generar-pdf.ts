/**
 * Generador de reportes PDF para REVISOR ARQ.
 * Usa jsPDF con renderizado puramente tipográfico (sin html2canvas).
 *
 * Plantillas:
 *   - ejecutivo: portada + síntesis + consulta + respuesta resumida + aviso
 *   - tecnico:   ídem + tabla normativa + fuentes + cruces + metadatos completos
 */

import { jsPDF } from "jspdf";
import type { CruceDetectado } from "./rag";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ConfigPDF {
  tipo: "ejecutivo" | "tecnico";
  nombreProyecto?: string;
  profesional?: string;
  // Nuevos campos
  numeroInforme?: string;
  rut?: string;
  registro?: string;
  direccion?: string;
  rol?: string;
  comuna?: string;
  dom?: string;
}

export interface FuentePDF {
  norma: string;
  articulo?: string | null;
  norma_titulo: string;
  url_fuente?: string;
}

export interface DatosPDF {
  pregunta: string;
  modo: string;
  modoLabel: string;
  contenido: string;
  fuentes?: FuentePDF[];
  cruces?: CruceDetectado[];
  fecha: string;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const TERRACOTTA: [number, number, number] = [163, 63, 39];
const TERRACOTTA_LIGHT: [number, number, number] = [242, 232, 227];
const INK: [number, number, number] = [28, 26, 23];
const INK2: [number, number, number] = [72, 68, 60];
const INK3: [number, number, number] = [130, 124, 112];
const WARN: [number, number, number] = [180, 120, 28];
const RULE: [number, number, number] = [220, 216, 208];
const PAPER2: [number, number, number] = [248, 246, 242];
const SUCCESS: [number, number, number] = [34, 110, 65];
const INFO: [number, number, number] = [38, 82, 160];

// Colores por tipo de norma (para tabla)
const TIPO_COLOR: Record<string, [number, number, number]> = {
  LGUC:  [38, 82, 160],
  OGUC:  [34, 110, 65],
  DDU:   [163, 63, 39],
  LEY:   [38, 82, 160],
  DFL:   [38, 82, 160],
  DS:    [100, 50, 140],
  NCH:   [60, 100, 120],
  PRC:   [140, 90, 20],
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 6;
const SMALL = 8;
const BODY = 9.5;
const H3 = 10.5;
const H2 = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, "  ")
    .replace(/^[-:| ]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrap(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(text, maxW) as string[];
}

function hRule(doc: jsPDF, y: number, color: [number, number, number] = RULE, w = 0.25) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 22) {
    doc.addPage();
    return 22;
  }
  return y;
}

/** Extrae el tipo de norma del string (ej: "OGUC Art. 2.1.1" → "OGUC") */
function tipoFromNorma(norma: string): string {
  const m = norma.match(/^(LGUC|OGUC|DDU|LEY|DFL|DS|NCH|PRC)/i);
  return m ? m[1].toUpperCase() : "NORMA";
}

function jerarquiaFromTipo(tipo: string): string {
  const map: Record<string, string> = {
    LGUC: "Ley", LEY: "Ley", DFL: "Ley",
    OGUC: "Reglamento", DS: "Decreto",
    DDU: "Instrucción", NCH: "Norma Técnica", PRC: "Plan Regulador",
  };
  return map[tipo] ?? "Norma";
}

// ─── Parser de Markdown → Bloques ─────────────────────────────────────────────

type Bloque =
  | { tipo: "h2"; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; texto: string; bold?: boolean }
  | { tipo: "lista"; items: string[] }
  | { tipo: "blockquote"; texto: string }
  | { tipo: "tabla"; filas: string[][] }
  | { tipo: "hr" };

function parsearMarkdown(md: string): Bloque[] {
  const bloques: Bloque[] = [];
  const lineas = md.split("\n");
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];

    if (/^##\s+/.test(linea)) {
      bloques.push({ tipo: "h2", texto: linea.replace(/^##\s+/, "").trim() });
      i++; continue;
    }
    if (/^###\s+/.test(linea)) {
      bloques.push({ tipo: "h3", texto: linea.replace(/^###\s+/, "").trim() });
      i++; continue;
    }
    if (/^---+\s*$/.test(linea.trim())) {
      bloques.push({ tipo: "hr" });
      i++; continue;
    }
    if (/^>\s+/.test(linea)) {
      const textos: string[] = [];
      while (i < lineas.length && /^>\s+/.test(lineas[i])) {
        textos.push(lineas[i].replace(/^>\s+/, ""));
        i++;
      }
      bloques.push({ tipo: "blockquote", texto: textos.join(" ") });
      continue;
    }
    if (/^\s*[-*+]\s+/.test(linea) || /^\s*\d+\.\s+/.test(linea)) {
      const items: string[] = [];
      while (i < lineas.length && (/^\s*[-*+]\s+/.test(lineas[i]) || /^\s*\d+\.\s+/.test(lineas[i]))) {
        items.push(lineas[i].replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      bloques.push({ tipo: "lista", items });
      continue;
    }
    if (/^\|/.test(linea)) {
      const filas: string[][] = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) {
        if (/^\|[-:| ]+\|/.test(lineas[i])) { i++; continue; }
        const celdas = lineas[i].split("|")
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => stripMarkdown(c.trim()));
        filas.push(celdas);
        i++;
      }
      if (filas.length) bloques.push({ tipo: "tabla", filas });
      continue;
    }
    if (linea.trim()) {
      const parrafos: string[] = [];
      while (i < lineas.length && lineas[i].trim() && !/^[#>|]/.test(lineas[i]) && !/^\s*[-*+]\s+/.test(lineas[i])) {
        parrafos.push(lineas[i].trim());
        i++;
      }
      bloques.push({ tipo: "p", texto: parrafos.join(" ") });
      continue;
    }
    i++;
  }
  return bloques;
}

/** Extrae el primer párrafo sustancial como síntesis */
function extraerSintesis(contenido: string): string {
  const bloques = parsearMarkdown(contenido);
  for (const b of bloques) {
    if (b.tipo === "p" && b.texto.length > 80) {
      const limpio = stripMarkdown(b.texto);
      return limpio.length > 400 ? limpio.slice(0, 397) + "…" : limpio;
    }
  }
  return "";
}

// ─── Portada ──────────────────────────────────────────────────────────────────

function dibujarPortada(doc: jsPDF, datos: DatosPDF, config: ConfigPDF) {
  const tipoLabel = config.tipo === "ejecutivo" ? "INFORME EJECUTIVO" : "INFORME TÉCNICO";
  const nInforme = config.numeroInforme ?? `INF-${new Date().getFullYear()}-001`;

  // — Bloque superior terracotta (0–60mm) —
  doc.setFillColor(...TERRACOTTA);
  doc.rect(0, 0, PAGE_W, 62, "F");

  // Línea decorativa más oscura bajo el bloque
  doc.setFillColor(130, 45, 25);
  doc.rect(0, 60, PAGE_W, 2, "F");

  // Logo placeholder — esquina superior derecha
  const logoX = PAGE_W - MARGIN - 28;
  const logoY = 8;
  doc.setDrawColor(255, 200, 185);
  doc.setLineWidth(0.4);
  doc.roundedRect(logoX, logoY, 28, 18, 2, 2, "D");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(255, 200, 185);
  doc.text("LOGO OFICINA", logoX + 14, logoY + 10, { align: "center" });

  // Nombre de la app
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("REVISOR ARQ", MARGIN, 20);

  // Subtítulo app
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 210, 195);
  doc.text("Consulta Normativa Chilena · LGUC · OGUC · DDU", MARGIN, 27);

  // Tipo de informe y número
  doc.setFillColor(130, 45, 25);
  doc.roundedRect(MARGIN, 34, 80, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(tipoLabel + " DE NORMATIVA", MARGIN + 4, 40.5);

  // Número de informe
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 230, 215);
  doc.text(nInforme, PAGE_W - MARGIN, 40.5, { align: "right" });

  // Fecha
  doc.setFontSize(7.5);
  doc.setTextColor(255, 210, 195);
  doc.text(datos.fecha, PAGE_W - MARGIN, 47, { align: "right" });

  // — Nombre del Proyecto (centro de página) —
  let yP = 78;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TERRACOTTA);
  doc.text("PROYECTO", MARGIN, yP);

  yP += 6;
  const nombreProy = config.nombreProyecto || "—";
  doc.setFont("times", "bold");
  const fsProy = nombreProy.length > 50 ? 18 : nombreProy.length > 30 ? 20 : 24;
  doc.setFontSize(fsProy);
  doc.setTextColor(...INK);
  const proyLines = wrap(doc, nombreProy, CONTENT_W);
  for (const line of proyLines) {
    doc.text(line, MARGIN, yP);
    yP += fsProy * 0.45;
  }

  // Modo consulta badge
  yP += 6;
  const modoW = 38;
  doc.setFillColor(...TERRACOTTA_LIGHT);
  doc.roundedRect(MARGIN, yP, modoW, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...TERRACOTTA);
  doc.text(`Modo ${datos.modoLabel}`, MARGIN + modoW / 2, yP + 4.5, { align: "center" });

  // — Grid de metadatos (banda inferior) —
  const bandY = 175;
  doc.setFillColor(...PAPER2);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.rect(0, bandY, PAGE_W, 68, "FD");

  // Fila 1: PROFESIONAL | RUT / REGISTRO | FECHA
  const gridY1 = bandY + 10;
  const cols3 = [MARGIN, MARGIN + 60, MARGIN + 120];

  [["PROFESIONAL", config.profesional || "—"],
   ["RUT", config.rut || "—"],
   ["N° INFORME", nInforme]].forEach(([label, val], ci) => {
    const cx = cols3[ci];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL - 1);
    doc.setTextColor(...INK3);
    doc.text(label, cx, gridY1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY);
    doc.setTextColor(...INK2);
    const v = wrap(doc, val, 52)[0] ?? val;
    doc.text(v, cx, gridY1 + 6);
  });

  // Fila 2: DIRECCIÓN | ROL | COMUNA
  const gridY2 = bandY + 28;
  [["DIRECCIÓN DEL PROYECTO", config.direccion || "—"],
   ["ROL / PREDIO", config.rol || "—"],
   ["COMUNA", config.comuna || "—"]].forEach(([label, val], ci) => {
    const cx = cols3[ci];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL - 1);
    doc.setTextColor(...INK3);
    doc.text(label, cx, gridY2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY);
    doc.setTextColor(...INK2);
    const v = wrap(doc, val, 52)[0] ?? val;
    doc.text(v, cx, gridY2 + 6);
  });

  // Fila 3: DOM | REGISTRO
  const gridY3 = bandY + 46;
  [["DIRECCIÓN DE OBRAS MUNICIPALES (DOM)", config.dom || "—"],
   ["N° REGISTRO PROFESIONAL", config.registro || "—"]].forEach(([label, val], ci) => {
    const cx = cols3[ci === 0 ? 0 : 1];
    const maxW = ci === 0 ? 90 : 52;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL - 1);
    doc.setTextColor(...INK3);
    doc.text(label, cx, gridY3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY);
    doc.setTextColor(...INK2);
    const v = wrap(doc, val, maxW)[0] ?? val;
    doc.text(v, cx, gridY3 + 6);
  });

  // — Footer de portada —
  doc.setFillColor(...TERRACOTTA);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 200, 185);
  doc.text("REVISOR ARQ · revisor-arq.vercel.app", PAGE_W / 2, PAGE_H - 7, { align: "center" });
  doc.setTextColor(255, 175, 155);
  doc.text("Las respuestas son orientativas y no constituyen asesoría jurídica profesional.", PAGE_W / 2, PAGE_H - 3.5, { align: "center" });
}

// ─── Footer de páginas de contenido ──────────────────────────────────────────

function dibujarFooter(doc: jsPDF, pagina: number, total: number, nInforme: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...INK3);
  doc.text(`REVISOR ARQ · revisor-arq.vercel.app · ${nInforme}`, MARGIN, PAGE_H - 7);
  doc.text(`Pág. ${pagina} de ${total}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
  doc.setFontSize(6.5);
  doc.setTextColor(180, 175, 165);
  doc.text("Documento de carácter informativo. No constituye asesoría jurídica profesional.", PAGE_W / 2, PAGE_H - 3.5, { align: "center" });
  // Línea fina sobre footer
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
}

// ─── Sección: Síntesis ────────────────────────────────────────────────────────

function dibujarSintesis(doc: jsPDF, sintesis: string, y: number): number {
  if (!sintesis) return y;

  const lines = wrap(doc, sintesis, CONTENT_W - 12);
  const boxH = lines.length * (LINE_H - 0.5) + 14;

  y = checkPage(doc, y, boxH + 6);

  // Caja destacada
  doc.setFillColor(...TERRACOTTA_LIGHT);
  doc.setDrawColor(...TERRACOTTA);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "FD");

  // Barra izquierda
  doc.setFillColor(...TERRACOTTA);
  doc.roundedRect(MARGIN, y, 3, boxH, 1.5, 1.5, "F");

  // Label "SÍNTESIS"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL - 0.5);
  doc.setTextColor(...TERRACOTTA);
  doc.text("SÍNTESIS", MARGIN + 7, y + 6);

  // Texto
  doc.setFont("helvetica", "italic");
  doc.setFontSize(BODY);
  doc.setTextColor(...INK2);
  let ty = y + 12;
  for (const line of lines) {
    doc.text(line, MARGIN + 7, ty);
    ty += LINE_H - 0.5;
  }

  return y + boxH + 8;
}

// ─── Sección: Tabla de Normativa Aplicable ────────────────────────────────────

function dibujarTablaNormativa(doc: jsPDF, fuentes: FuentePDF[], y: number): number {
  if (!fuentes.length) return y;

  // Deduplicar por norma+articulo
  const vistas = new Set<string>();
  const unicas = fuentes.filter((f) => {
    const key = f.norma + (f.articulo ?? "");
    if (vistas.has(key)) return false;
    vistas.add(key);
    return true;
  });

  y = checkPage(doc, y, 20);

  hRule(doc, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL);
  doc.setTextColor(...TERRACOTTA);
  doc.text("NORMATIVA APLICABLE", MARGIN, y);
  y += 7;

  // Encabezado de tabla
  const colW = [28, 22, 90, 28];  // Norma | Tipo | Título | Jerarquía
  const headers = ["NORMA", "TIPO", "TÍTULO", "JERARQUÍA"];
  const totalW = CONTENT_W;

  doc.setFillColor(...PAPER2);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y - 4.5, totalW, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL - 0.5);
  doc.setTextColor(...INK);
  let cx = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.text(h, cx, y);
    cx += colW[i];
  });
  y += 5;
  hRule(doc, y, RULE, 0.2);
  y += 3;

  // Filas
  for (let fi = 0; fi < unicas.length; fi++) {
    const f = unicas[fi];
    const tipo = tipoFromNorma(f.norma);
    const color = TIPO_COLOR[tipo] ?? INK2;
    const jerarquia = jerarquiaFromTipo(tipo);

    y = checkPage(doc, y, LINE_H + 4);

    if (fi % 2 === 1) {
      doc.setFillColor(252, 251, 249);
      doc.rect(MARGIN, y - 4, totalW, LINE_H + 2, "F");
    }

    cx = MARGIN + 2;

    // Norma (con color de tipo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL - 0.5);
    doc.setTextColor(...color);
    const normaShort = f.articulo ? `${tipo} ${f.articulo}` : wrap(doc, f.norma, colW[0] - 4)[0];
    doc.text(normaShort, cx, y);
    cx += colW[0];

    // Badge tipo
    doc.setFillColor(...color);
    doc.roundedRect(cx, y - 3.5, colW[1] - 4, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(tipo, cx + (colW[1] - 4) / 2 - 2, y - 0.5);
    cx += colW[1];

    // Título
    doc.setFont("helvetica", "normal");
    doc.setFontSize(SMALL - 0.5);
    doc.setTextColor(...INK2);
    const tituloShort = wrap(doc, f.norma_titulo, colW[2] - 4)[0] ?? f.norma_titulo;
    doc.text(tituloShort, cx, y);
    cx += colW[2];

    // Jerarquía
    doc.setTextColor(...INK3);
    doc.text(jerarquia, cx, y);

    hRule(doc, y + LINE_H / 2 + 1, [238, 234, 228], 0.15);
    y += LINE_H + 2;
  }

  return y + 4;
}

// ─── Render de bloques de contenido ──────────────────────────────────────────

function renderBloques(doc: jsPDF, bloques: Bloque[], yIn: number): number {
  let y = yIn;

  for (const bloque of bloques) {
    switch (bloque.tipo) {

      case "h2": {
        y = checkPage(doc, y, 12);
        y += 2;
        doc.setFillColor(...PAPER2);
        doc.rect(MARGIN, y - 4, CONTENT_W, 9, "F");
        doc.setFillColor(...TERRACOTTA);
        doc.rect(MARGIN, y - 4, 2.5, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(H2);
        doc.setTextColor(...INK);
        for (const l of wrap(doc, stripMarkdown(bloque.texto), CONTENT_W - 8)) {
          doc.text(l, MARGIN + 6, y);
          y += LINE_H + 1;
        }
        y += 2;
        break;
      }

      case "h3": {
        y = checkPage(doc, y, 9);
        y += 1;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(H3);
        doc.setTextColor(...INK2);
        doc.text(stripMarkdown(bloque.texto), MARGIN, y);
        y += LINE_H + 1;
        break;
      }

      case "p": {
        const lines = wrap(doc, stripMarkdown(bloque.texto), CONTENT_W);
        for (const line of lines) {
          y = checkPage(doc, y, LINE_H);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(BODY);
          doc.setTextColor(...INK2);
          doc.text(line, MARGIN, y);
          y += LINE_H;
        }
        y += 2;
        break;
      }

      case "lista": {
        for (const item of bloque.items) {
          const itemLines = wrap(doc, stripMarkdown(item), CONTENT_W - 8);
          for (let li = 0; li < itemLines.length; li++) {
            y = checkPage(doc, y, LINE_H);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(BODY);
            doc.setTextColor(...INK2);
            if (li === 0) {
              doc.setFillColor(...TERRACOTTA);
              doc.circle(MARGIN + 2.2, y - 1.5, 0.9, "F");
              doc.text(itemLines[li], MARGIN + 6, y);
            } else {
              doc.text(itemLines[li], MARGIN + 6, y);
            }
            y += LINE_H;
          }
        }
        y += 2;
        break;
      }

      case "blockquote": {
        // Cita literal destacada
        const bqLines = wrap(doc, stripMarkdown(bloque.texto), CONTENT_W - 12);
        const bqH = bqLines.length * LINE_H + 10;
        y = checkPage(doc, y, bqH);

        doc.setFillColor(244, 240, 233);
        doc.setDrawColor(200, 190, 170);
        doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN, y - 3, CONTENT_W, bqH, 1.5, 1.5, "FD");

        // Barra izquierda dorada (cita legal)
        doc.setFillColor(160, 120, 50);
        doc.rect(MARGIN, y - 3, 3, bqH, "F");

        // Comilla decorativa
        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(180, 160, 120);
        doc.text("\u201C", MARGIN + 5, y + 4);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(BODY);
        doc.setTextColor(...INK2);
        let bqY = y + 3;
        for (const l of bqLines) {
          doc.text(l, MARGIN + 12, bqY);
          bqY += LINE_H;
        }
        y += bqH + 4;
        break;
      }

      case "tabla": {
        if (!bloque.filas.length) break;
        const cols = bloque.filas[0].length;
        const colW = CONTENT_W / cols;
        for (let fi = 0; fi < bloque.filas.length; fi++) {
          const fila = bloque.filas[fi];
          y = checkPage(doc, y, LINE_H + 2);
          if (fi === 0) {
            doc.setFillColor(...PAPER2);
            doc.rect(MARGIN, y - 4, CONTENT_W, LINE_H + 2, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(SMALL);
            doc.setTextColor(...INK);
          } else {
            if (fi % 2 === 0) {
              doc.setFillColor(252, 251, 249);
              doc.rect(MARGIN, y - 4, CONTENT_W, LINE_H + 2, "F");
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(SMALL);
            doc.setTextColor(...INK2);
          }
          fila.forEach((celda, ci) => {
            doc.text(wrap(doc, celda, colW - 4)[0] ?? "", MARGIN + ci * colW + 2, y);
          });
          hRule(doc, y + LINE_H / 2, [235, 231, 224], 0.15);
          y += LINE_H + 2;
        }
        y += 3;
        break;
      }

      case "hr": {
        y = checkPage(doc, y, 6);
        y += 2;
        hRule(doc, y);
        y += 4;
        break;
      }
    }
  }

  return y;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function generarPDF(datos: DatosPDF, config: ConfigPDF): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const nInforme = config.numeroInforme ?? `INF-${new Date().getFullYear()}-001`;

  // ── Página 1: Portada ─────────────────────────────────────────────────────
  dibujarPortada(doc, datos, config);

  // ── Páginas de contenido ──────────────────────────────────────────────────
  doc.addPage();
  let y = 22;

  // Cabecera de sección reutilizable
  function seccion(label: string) {
    y = checkPage(doc, y, 12);
    hRule(doc, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL);
    doc.setTextColor(...TERRACOTTA);
    doc.text(label, MARGIN, y);
    y += 6;
  }

  // — Síntesis —
  const sintesis = extraerSintesis(datos.contenido);
  y = dibujarSintesis(doc, sintesis, y);

  // — Consulta —
  seccion("CONSULTA");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  doc.setTextColor(...INK2);
  for (const line of wrap(doc, datos.pregunta, CONTENT_W)) {
    y = checkPage(doc, y, LINE_H);
    doc.text(line, MARGIN, y);
    y += LINE_H;
  }
  y += 4;

  // — Respuesta —
  seccion("RESPUESTA");

  const contenidoLimpio = datos.contenido
    .replace(/---\s*⚠️[\s\S]*$/, "")
    .replace(/⚠️\s*\*\*Aviso legal\*\*[\s\S]*$/, "")
    .trim();

  y = renderBloques(doc, parsearMarkdown(contenidoLimpio), y);

  // — Tabla de normativa (modo técnico) —
  if (config.tipo === "tecnico" && datos.fuentes?.length) {
    y += 4;
    y = dibujarTablaNormativa(doc, datos.fuentes, y);
  }

  // — Fuentes normativas (modo técnico) —
  if (config.tipo === "tecnico" && datos.fuentes?.length) {
    y += 2;
    y = checkPage(doc, y, 12);
    seccion("FUENTES NORMATIVAS CONSULTADAS");

    for (const fuente of datos.fuentes) {
      y = checkPage(doc, y, LINE_H + 4);
      const normaLabel = fuente.articulo
        ? `${fuente.norma} — Art. ${fuente.articulo}`
        : fuente.norma;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(SMALL);
      doc.setTextColor(...INK2);
      doc.text("• " + normaLabel, MARGIN, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK3);
      y += LINE_H - 1;
      doc.text(wrap(doc, fuente.norma_titulo, CONTENT_W - 8)[0] ?? "", MARGIN + 4, y);
      y += LINE_H + 1;
    }
  }

  // — Cruces regulatorios (modo técnico) —
  if (config.tipo === "tecnico" && datos.cruces?.length) {
    y += 2;
    y = checkPage(doc, y, 14);
    hRule(doc, y, WARN, 0.3);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL);
    doc.setTextColor(...WARN);
    doc.text("DOMINIOS REGULATORIOS ADICIONALES DETECTADOS", MARGIN, y);
    y += 6;

    for (const cruce of datos.cruces) {
      y = checkPage(doc, y, LINE_H * 3 + 6);
      doc.setFillColor(255, 249, 235);
      doc.setDrawColor(...WARN);
      doc.setLineWidth(0.2);
      doc.roundedRect(MARGIN, y - 3, CONTENT_W, LINE_H * 3, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(SMALL);
      doc.setTextColor(...INK);
      doc.text(`${cruce.emoji}  ${cruce.area}`, MARGIN + 3, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK2);
      doc.text(`Organismo: ${cruce.organismo}`, MARGIN + 3, y + LINE_H + 1);
      doc.text(`Marco probable: ${cruce.norma_probable}`, MARGIN + 3, y + LINE_H * 2);
      y += LINE_H * 3 + 5;
    }
  }

  // — Aviso legal —
  y += 4;
  y = checkPage(doc, y, 16);
  hRule(doc, y);
  y += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(SMALL - 0.5);
  doc.setTextColor(...INK3);
  const aviso = wrap(
    doc,
    "Aviso legal: Las respuestas generadas por REVISOR ARQ son de carácter exclusivamente informativo y no constituyen asesoría jurídica, técnica ni profesional. Verifique siempre la norma vigente en la Biblioteca del Congreso Nacional (www.bcn.cl) y consulte con un profesional habilitado antes de tomar decisiones.",
    CONTENT_W
  );
  for (const l of aviso) {
    y = checkPage(doc, y, LINE_H);
    doc.text(l, MARGIN, y);
    y += LINE_H - 0.5;
  }

  // — Footers en todas las páginas de contenido (con X de Y) —
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  const contentPages = totalPages - 1; // la portada no tiene footer de contenido
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    dibujarFooter(doc, p - 1, contentPages, nInforme);
  }

  // — Guardar —
  const fechaSlug = new Date().toISOString().slice(0, 10);
  const proyectoSlug = config.nombreProyecto
    ? "-" + config.nombreProyecto.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)
    : "";
  const filename = `${nInforme}${proyectoSlug}-${fechaSlug}.pdf`;
  doc.save(filename);
}
