/**
 * Descarga LGUC y OGUC desde BCN (nuevo.leychile.cl) como PDF,
 * luego extrae el texto con pdf-parse.
 *
 * La BCN migró a SPA; el texto se obtiene vía su endpoint de exportación PDF:
 *   https://nuevo.leychile.cl/servicios/Consulta/Exportar?...&hddResultadoExportar={id}.{YYYY-MM-DD}.0.0%23
 *
 * El script detecta automáticamente la versión vigente escaneando la página BCN.
 * Si falla, usa URLs de fallback con la última fecha conocida.
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { CORPUS_ROOT, loadManifiesto, saveManifiesto, type ManifiestoEntry } from "./manifiesto";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (RevisorArq/1.0)";

interface NormaBCN {
  tipo: "LGUC" | "OGUC";
  numero: string;
  titulo: string;
  idNorma: string;
  dir: string;
  filename: string;
  fallbackVersion: string; // última versión conocida; se actualiza con cada descarga
}

const NORMAS: NormaBCN[] = [
  {
    tipo: "LGUC",
    numero: "DFL-458",
    titulo: "Ley General de Urbanismo y Construcciones",
    idNorma: "13560",
    dir: join(CORPUS_ROOT, "lguc"),
    filename: "LGUC",
    fallbackVersion: "2026-03-29",
  },
  {
    tipo: "OGUC",
    numero: "DS-47",
    titulo: "Ordenanza General de Urbanismo y Construcciones",
    idNorma: "8201",
    dir: join(CORPUS_ROOT, "oguc"),
    filename: "OGUC",
    fallbackVersion: "2026-03-16",
  },
];

async function detectVersionDate(idNorma: string, fallback: string): Promise<string> {
  try {
    const res = await fetch(`https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}`, {
      headers: { "User-Agent": UA },
    });
    const html = await res.text();
    // El HTML contiene la URL de exportación con la versión vigente
    const match = html.match(new RegExp(`hddResultadoExportar=${idNorma}\\.(\\d{4}-\\d{2}-\\d{2})`));
    if (match) return match[1];
  } catch {
    // usa fallback
  }
  return fallback;
}

function buildExportURL(idNorma: string, versionDate: string, filename: string): string {
  const params = new URLSearchParams({
    radioExportar: "Normas",
    exportar_formato: "pdf",
    nombrearchivo: filename,
    exportar_con_notas_bcn: "True",
    exportar_con_notas_originales: "True",
    exportar_con_notas_al_pie: "True",
    hddResultadoExportar: `${idNorma}.${versionDate}.0.0#`,
  });
  return `https://nuevo.leychile.cl/servicios/Consulta/Exportar?${params}`;
}

async function downloadPDFAndExtractText(url: string): Promise<{ text: string; pages: number }> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`BCN respondió HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf")) {
    throw new Error(`Respuesta inesperada: ${contentType} (esperado PDF)`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 10_000) throw new Error(`PDF demasiado pequeño: ${buffer.length} bytes`);

  // pdf-parse v1 exporta la función directamente como CJS default
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);

  return { text: data.text, pages: data.numpages };
}

export async function downloadBCN(forceUpdate = false): Promise<void> {
  const manifiesto = loadManifiesto();

  for (const norma of NORMAS) {
    console.log(`\n📥 ${norma.tipo} — ${norma.titulo}`);
    mkdirSync(norma.dir, { recursive: true });

    const txtPath = join(norma.dir, `${norma.filename}.txt`);
    const pdfPath = join(norma.dir, `${norma.filename}.pdf`);

    // Detectar versión vigente
    process.stdout.write("  Detectando versión vigente... ");
    const versionDate = await detectVersionDate(norma.idNorma, norma.fallbackVersion);
    console.log(versionDate);

    const pageFilename = norma.tipo === "LGUC" ? "DTO-458_13-ABR-1976" : "DTO-47_05-JUN-1992";
    const exportURL = buildExportURL(norma.idNorma, versionDate, pageFilename);
    const sourceURL = `https://www.bcn.cl/leychile/navegar?idNorma=${norma.idNorma}`;

    try {
      process.stdout.write("  Descargando PDF... ");
      const { text, pages } = await downloadPDFAndExtractText(exportURL);

      if (text.length < 5_000) {
        throw new Error(`Texto extraído demasiado corto: ${text.length} chars`);
      }

      const hash = createHash("sha256").update(text).digest("hex");
      const existing = manifiesto[norma.tipo];

      if (!forceUpdate && existing?.hash === hash && existsSync(txtPath)) {
        console.log(`sin cambios`);
        continue;
      }

      // Guardar texto y PDF
      writeFileSync(txtPath, text, "utf-8");
      console.log(`✓ (${pages} págs, ${text.length.toLocaleString()} chars)`);

      // Re-descargar PDF para guardarlo en disco
      const pdfRes = await fetch(exportURL, { headers: { "User-Agent": UA } });
      if (pdfRes.ok) {
        const buf = Buffer.from(await pdfRes.arrayBuffer());
        writeFileSync(pdfPath, buf);
        console.log(`  📄 PDF guardado: ${buf.length.toLocaleString()} bytes`);
      }

      const entry: ManifiestoEntry = {
        tipo: norma.tipo,
        numero: norma.numero,
        titulo: norma.titulo,
        url_fuente: sourceURL,
        fecha_descarga: new Date().toISOString(),
        hash,
        archivo: txtPath,
        chars: text.length,
        paginas: pages,
      };
      manifiesto[norma.tipo] = entry;
      saveManifiesto(manifiesto);
    } catch (err) {
      console.error(`\n  ✗ Error: ${(err as Error).message}`);
      throw err;
    }

    await new Promise((r) => setTimeout(r, 2_000));
  }
}
