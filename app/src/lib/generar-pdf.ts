/**
 * Generador de reportes PDF para REVISOR ARQ.
 * Usa jsPDF con renderizado puramente tipográfico (sin html2canvas).
 *
 * Soporta dos plantillas:
 *   - ejecutivo: resumen conciso, menos detalle técnico
 *   - tecnico:   incluye fuentes, cruces y metadatos completos
 */

import { jsPDF } from "jspdf";
import type { CruceDetectado } from "./rag";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ConfigPDF {
  tipo: "ejecutivo" | "tecnico";
  nombreProyecto?: string;
  profesional?: string;
}

export interface FuentePDF {
  norma: string;
  articulo?: string | null;
  norma_titulo: string;
  url_fuente?: string;
}

export interface DatosPDF {
  pregunta: string;
  modo: string;          // "arquitecto" | "abogado" | "profundo"
  modoLabel: string;     // "Arquitecto" | "Abogado" | "Profundo"
  contenido: string;     // markdown de la respuesta
  fuentes?: FuentePDF[];
  cruces?: CruceDetectado[];
  fecha: string;         // ej. "24 de abril de 2026"
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MARGIN = 18;          // mm izquierda/derecha
const PAGE_W = 210;         // A4 mm
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 6;           // altura de línea base
const SMALL = 8;            // tamaño fuente pequeño
const BODY = 9.5;           // tamaño fuente cuerpo
const H3 = 10.5;            // subtítulos
const H2 = 12;              // encabezados de sección
const TERRACOTTA: [number, number, number] = [163, 63, 39];
const INK: [number, number, number] = [28, 26, 23];
const INK2: [number, number, number] = [72, 68, 60];
const INK3: [number, number, number] = [130, 124, 112];
const WARN: [number, number, number] = [180, 120, 28];
const RULE: [number, number, number] = [220, 216, 208];
const PAPER2: [number, number, number] = [248, 246, 242];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Elimina marcadores markdown y devuelve texto limpio para jsPDF.
 * No es un parser completo; cubre los patrones que genera el LLM.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")       // **bold**
    .replace(/\*(.+?)\*/g, "$1")            // *italic*
    .replace(/`([^`]+)`/g, "$1")            // `code`
    .replace(/~~(.+?)~~/g, "$1")            // ~~strike~~
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url)
    .replace(/^#{1,6}\s+/gm, "")           // headings
    .replace(/^>\s+/gm, "")                // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "• ")       // listas
    .replace(/^\s*\d+\.\s+/gm, "")         // listas numeradas
    .replace(/\|/g, "  ")                  // tablas: separadores
    .replace(/^[-:| ]+$/gm, "")            // tablas: línea separadora
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Divide texto en líneas que caben en maxWidth mm con el font activo. */
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

/** Dibuja una línea horizontal fina. */
function hRule(doc: jsPDF, y: number, color: [number, number, number] = RULE) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

/** Retorna nueva posición Y; añade nueva página si no hay espacio. */
function checkPage(doc: jsPDF, y: number, needed: number, addFooter: () => void): number {
  const maxY = 297 - 20; // A4 height - bottom margin
  if (y + needed > maxY) {
    addFooter();
    doc.addPage();
    return 20; // top margin nueva página
  }
  return y;
}

// ─── Parseo de markdown → bloques ─────────────────────────────────────────────

type Bloque =
  | { tipo: "h2"; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; texto: string }
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

    // H2
    if (/^##\s+/.test(linea)) {
      bloques.push({ tipo: "h2", texto: linea.replace(/^##\s+/, "").trim() });
      i++;
      continue;
    }

    // H3
    if (/^###\s+/.test(linea)) {
      bloques.push({ tipo: "h3", texto: linea.replace(/^###\s+/, "").trim() });
      i++;
      continue;
    }

    // HR
    if (/^---+\s*$/.test(linea.trim())) {
      bloques.push({ tipo: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s+/.test(linea)) {
      const textos: string[] = [];
      while (i < lineas.length && /^>\s+/.test(lineas[i])) {
        textos.push(lineas[i].replace(/^>\s+/, ""));
        i++;
      }
      bloques.push({ tipo: "blockquote", texto: textos.join(" ") });
      continue;
    }

    // Lista
    if (/^\s*[-*+]\s+/.test(linea) || /^\s*\d+\.\s+/.test(linea)) {
      const items: string[] = [];
      while (
        i < lineas.length &&
        (/^\s*[-*+]\s+/.test(lineas[i]) || /^\s*\d+\.\s+/.test(lineas[i]))
      ) {
        items.push(
          lineas[i]
            .replace(/^\s*[-*+]\s+/, "")
            .replace(/^\s*\d+\.\s+/, "")
            .trim()
        );
        i++;
      }
      bloques.push({ tipo: "lista", items });
      continue;
    }

    // Tabla markdown
    if (/^\|/.test(linea)) {
      const filas: string[][] = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) {
        // Saltar líneas separadoras (|---|---|)
        if (/^\|[-:| ]+\|/.test(lineas[i])) { i++; continue; }
        const celdas = lineas[i]
          .split("|")
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => stripMarkdown(c.trim()));
        filas.push(celdas);
        i++;
      }
      if (filas.length) bloques.push({ tipo: "tabla", filas });
      continue;
    }

    // Párrafo (acumula líneas no vacías)
    if (linea.trim()) {
      const parrafos: string[] = [];
      while (i < lineas.length && lineas[i].trim() && !/^[#>|-]/.test(lineas[i]) && !/^\s*[-*+]\s+/.test(lineas[i])) {
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

// ─── Función principal ────────────────────────────────────────────────────────

export async function generarPDF(datos: DatosPDF, config: ConfigPDF): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = 0;

  const tipoLabel = config.tipo === "ejecutivo" ? "Informe Ejecutivo" : "Informe Técnico";

  // ── Footer helper ─────────────────────────────────────────────────────────
  function dibujarFooter() {
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...INK3);
    doc.text(
      `REVISOR ARQ · revisor-arq.vercel.app · Pág. ${pageCount}`,
      PAGE_W / 2,
      290,
      { align: "center" }
    );
    doc.text(
      "Esta respuesta es orientativa. No constituye asesoría jurídica profesional.",
      PAGE_W / 2,
      293.5,
      { align: "center" }
    );
  }

  function check(needed: number) {
    y = checkPage(doc, y, needed, dibujarFooter);
  }

  // ── PORTADA / HEADER ──────────────────────────────────────────────────────

  // Barra superior terracotta
  doc.setFillColor(...TERRACOTTA);
  doc.rect(0, 0, PAGE_W, 28, "F");

  // Nombre app
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("REVISOR ARQ", MARGIN, 12);

  // Tipo de informe
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 220, 200);
  doc.text(tipoLabel.toUpperCase() + " · CONSULTA NORMATIVA", MARGIN, 19);

  // Fecha alineada a la derecha
  doc.setFontSize(8);
  doc.text(datos.fecha, PAGE_W - MARGIN, 19, { align: "right" });

  y = 36;

  // ── CAJA DE METADATOS ─────────────────────────────────────────────────────

  doc.setFillColor(...PAPER2);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL);
  doc.setTextColor(...INK3);

  const col1 = MARGIN + 4;
  const col2 = MARGIN + 60;
  const col3 = MARGIN + 120;
  const metaY = y + 6;

  doc.text("MODO", col1, metaY);
  doc.text("PROYECTO", col2, metaY);
  doc.text("PROFESIONAL", col3, metaY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK2);
  doc.setFontSize(BODY);

  doc.text(datos.modoLabel, col1, metaY + 6);
  doc.text(config.nombreProyecto || "—", col2, metaY + 6);
  doc.text(config.profesional || "—", col3, metaY + 6);

  y += 28;

  // ── SECCIÓN: CONSULTA ─────────────────────────────────────────────────────

  hRule(doc, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL);
  doc.setTextColor(...TERRACOTTA);
  doc.text("CONSULTA", MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  doc.setTextColor(...INK2);
  const preguntaLines = wrapText(doc, datos.pregunta, CONTENT_W);
  for (const line of preguntaLines) {
    check(LINE_H);
    doc.text(line, MARGIN, y);
    y += LINE_H;
  }

  y += 4;

  // ── SECCIÓN: RESPUESTA ────────────────────────────────────────────────────

  hRule(doc, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(SMALL);
  doc.setTextColor(...TERRACOTTA);
  doc.text("RESPUESTA", MARGIN, y);
  y += 6;

  // Limpiar disclaimer del final antes de renderizar (se pone en footer)
  // Usamos [\s\S]* en lugar del flag /s para compatibilidad con ES2017
  const contenidoLimpio = datos.contenido
    .replace(/---\s*⚠️[\s\S]*$/, "")
    .replace(/⚠️\s*\*\*Aviso legal\*\*[\s\S]*$/, "")
    .trim();

  const bloques = parsearMarkdown(contenidoLimpio);

  for (const bloque of bloques) {
    switch (bloque.tipo) {
      case "h2": {
        check(10);
        y += 2;
        // Fondo sutil bajo encabezado
        doc.setFillColor(...PAPER2);
        doc.rect(MARGIN, y - 4, CONTENT_W, 8, "F");
        // Barra izquierda terracotta
        doc.setFillColor(...TERRACOTTA);
        doc.rect(MARGIN, y - 4, 2, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(H2);
        doc.setTextColor(...INK);
        const textoH2 = stripMarkdown(bloque.texto);
        const h2Lines = wrapText(doc, textoH2, CONTENT_W - 6);
        for (const l of h2Lines) {
          doc.text(l, MARGIN + 5, y);
          y += LINE_H + 1;
        }
        y += 2;
        break;
      }

      case "h3": {
        check(8);
        y += 1;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(H3);
        doc.setTextColor(...INK2);
        const textoH3 = stripMarkdown(bloque.texto);
        doc.text(textoH3, MARGIN, y);
        y += LINE_H + 1;
        break;
      }

      case "p": {
        const lines = wrapText(doc, stripMarkdown(bloque.texto), CONTENT_W);
        for (const line of lines) {
          check(LINE_H);
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
          const itemLines = wrapText(doc, stripMarkdown(item), CONTENT_W - 8);
          for (let li = 0; li < itemLines.length; li++) {
            check(LINE_H);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(BODY);
            doc.setTextColor(...INK2);
            if (li === 0) {
              doc.setFillColor(...TERRACOTTA);
              doc.circle(MARGIN + 2.2, y - 1.5, 0.8, "F");
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
        const bqLines = wrapText(doc, stripMarkdown(bloque.texto), CONTENT_W - 10);
        const bqH = bqLines.length * LINE_H + 4;
        check(bqH);
        doc.setFillColor(245, 243, 238);
        doc.rect(MARGIN, y - 3, CONTENT_W, bqH, "F");
        doc.setFillColor(...TERRACOTTA);
        doc.rect(MARGIN, y - 3, 2, bqH, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(BODY);
        doc.setTextColor(...INK2);
        for (const l of bqLines) {
          doc.text(l, MARGIN + 5, y);
          y += LINE_H;
        }
        y += 4;
        break;
      }

      case "tabla": {
        if (!bloque.filas.length) break;
        const cols = bloque.filas[0].length;
        const colW = CONTENT_W / cols;

        for (let fi = 0; fi < bloque.filas.length; fi++) {
          const fila = bloque.filas[fi];
          check(LINE_H + 2);

          if (fi === 0) {
            // Header de tabla
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
            const cx = MARGIN + ci * colW + 2;
            const celdaLines = wrapText(doc, celda, colW - 4);
            doc.text(celdaLines[0] ?? "", cx, y);
          });

          hRule(doc, y + LINE_H / 2, [235, 231, 224]);
          y += LINE_H + 2;
        }
        y += 3;
        break;
      }

      case "hr": {
        check(6);
        y += 2;
        hRule(doc, y);
        y += 4;
        break;
      }
    }
  }

  // ── SECCIÓN: FUENTES (solo modo técnico) ──────────────────────────────────

  if (config.tipo === "tecnico" && datos.fuentes?.length) {
    y += 2;
    check(12);
    hRule(doc, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL);
    doc.setTextColor(...TERRACOTTA);
    doc.text("FUENTES NORMATIVAS CONSULTADAS", MARGIN, y);
    y += 6;

    for (const fuente of datos.fuentes) {
      check(LINE_H + 2);
      const normaLabel = fuente.articulo
        ? `${fuente.norma} – Art. ${fuente.articulo}`
        : fuente.norma;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(SMALL);
      doc.setTextColor(...INK2);
      doc.text("• " + normaLabel, MARGIN, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK3);
      const tituloLines = wrapText(doc, fuente.norma_titulo, CONTENT_W - 8);
      y += LINE_H - 1;
      doc.text(tituloLines[0] ?? "", MARGIN + 4, y);
      y += LINE_H + 1;
    }
  }

  // ── SECCIÓN: CRUCES REGULATORIOS (solo modo técnico) ──────────────────────

  if (config.tipo === "tecnico" && datos.cruces?.length) {
    y += 2;
    check(14);
    hRule(doc, y, WARN);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(SMALL);
    doc.setTextColor(...WARN);
    doc.text("⚠  DOMINIOS REGULATORIOS ADICIONALES DETECTADOS", MARGIN, y);
    y += 6;

    for (const cruce of datos.cruces) {
      check(LINE_H * 3 + 4);

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

      y += LINE_H * 3 + 4;
    }
  }

  // ── AVISO LEGAL FINAL ─────────────────────────────────────────────────────

  y += 4;
  check(14);
  hRule(doc, y);
  y += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(SMALL);
  doc.setTextColor(...INK3);
  const avisoLines = wrapText(
    doc,
    "Aviso legal: Las respuestas generadas por REVISOR ARQ son de carácter exclusivamente informativo y no constituyen asesoría jurídica, técnica ni profesional. Verifique siempre la norma vigente en BCN (www.bcn.cl) y consulte con un profesional habilitado antes de tomar decisiones.",
    CONTENT_W
  );
  for (const l of avisoLines) {
    check(LINE_H);
    doc.text(l, MARGIN, y);
    y += LINE_H - 0.5;
  }

  // Footer última página
  dibujarFooter();

  // ── Generar nombre de archivo y guardar ────────────────────────────────────

  const fechaSlug = new Date().toISOString().slice(0, 10);
  const proyectoSlug = config.nombreProyecto
    ? "-" + config.nombreProyecto.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)
    : "";
  const filename = `revisor-arq-${config.tipo}${proyectoSlug}-${fechaSlug}.pdf`;

  doc.save(filename);
}
