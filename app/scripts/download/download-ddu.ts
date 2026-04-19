/**
 * Descarga DDUs vigentes del MINVU (minvu.gob.cl).
 * Scrape de índices de Circulares Generales y Específicas con PDF directo.
 * Rate limit: 1 req / 2s.
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";
import { CORPUS_ROOT, loadManifiesto, saveManifiesto, type ManifiestoEntry } from "./manifiesto";

const DDU_DIR = join(CORPUS_ROOT, "ddu");
const RATE_MS = 2_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (RevisorArq/1.0)";

// Páginas de índice con links a PDFs de DDU en MINVU
const DDU_INDEX_PAGES = [
  {
    url: "https://www.minvu.gob.cl/elementos-tecnicos/circulares-division-de-desarrollo-urbano-ddu/circulares-generales-por-numero/",
    tipo: "GENERAL",
  },
  {
    url: "https://www.minvu.gob.cl/elementos-tecnicos/circulares-division-de-desarrollo-urbano-ddu/circulares-especificas-ddu-por-numero/",
    tipo: "ESPECIFICA",
  },
];

interface DDUItem {
  key: string;     // e.g. "DDU-227" o "DDU-ESP-001-07"
  numero: string;
  titulo: string;
  tipo: string;
  pdfUrl: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

async function scrapeIndexPage(pageUrl: string, tipo: string): Promise<DDUItem[]> {
  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);
  const items: DDUItem[] = [];

  $("a[href$='.pdf']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.includes("minvu.gob.cl")) return;

    const texto = $(el).text().trim();

    // Extraer número según tipo
    let numero = "";
    let key = "";

    if (tipo === "GENERAL") {
      const m = texto.match(/DDU\s+(\d+)/i) || href.match(/DDU-?(\d+)\.pdf/i);
      if (!m) return;
      numero = m[1].padStart(3, "0");
      key = `DDU-${numero}`;
    } else {
      // Específica: "DDU-ESP NNN-YY"
      const m = texto.match(/DDU[- ]ESP[- ]?(\d+)[- ](\d+)/i) ||
                href.match(/DDU[-_]ESP[-_]?(\d+)[- _](\d+)/i);
      if (!m) return;
      numero = `${m[1].padStart(3, "0")}-${m[2]}`;
      key = `DDU-ESP-${numero}`;
    }

    if (items.some((i) => i.key === key)) return;

    items.push({
      key,
      numero,
      titulo: texto.slice(0, 150),
      tipo,
      pdfUrl: href,
    });
  });

  return items;
}

async function downloadAndParsePDF(pdfUrl: string): Promise<{ text: string; pages: number } | null> {
  const res = await fetch(pdfUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.log(`✗ HTTP ${res.status}`);
    return null;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1_000) {
    console.log(`✗ PDF vacío (${buffer.length} bytes)`);
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    return { text: data.text, pages: data.numpages };
  } catch (err) {
    console.log(`✗ Error PDF: ${(err as Error).message.slice(0, 60)}`);
    return null;
  }
}

export async function downloadDDUs(
  opts: { limite?: number; forceUpdate?: boolean; soloGenerales?: boolean } = {}
): Promise<void> {
  const limite = opts.limite ?? 50;
  const forceUpdate = opts.forceUpdate ?? false;
  const soloGenerales = opts.soloGenerales ?? false;

  mkdirSync(DDU_DIR, { recursive: true });
  const manifiesto = loadManifiesto();

  console.log(`\n📥 Descargando DDUs (límite ${limite} por categoría)...`);

  const pagesToScrape = soloGenerales
    ? DDU_INDEX_PAGES.slice(0, 1)
    : DDU_INDEX_PAGES;

  let totalDescargados = 0;
  let totalSaltados = 0;

  for (const { url, tipo } of pagesToScrape) {
    console.log(`\n  📋 Índice ${tipo}: ${url}`);

    let items: DDUItem[];
    try {
      items = await scrapeIndexPage(url, tipo);
      console.log(`     ${items.length} DDUs encontrados`);
      await sleep(RATE_MS);
    } catch (err) {
      console.error(`  ✗ Error scrapeando índice: ${(err as Error).message}`);
      continue;
    }

    let descargados = 0;
    let saltados = 0;
    const batch = items.slice(0, limite);

    for (const item of batch) {
      const txtPath = join(DDU_DIR, `${item.key}.txt`);
      const pdfPath = join(DDU_DIR, `${item.key}.pdf`);

      if (!forceUpdate && existsSync(txtPath) && manifiesto[item.key]) {
        saltados++;
        totalSaltados++;
        continue;
      }

      process.stdout.write(`  → ${item.key.padEnd(20)} `);

      await sleep(RATE_MS);

      const result = await downloadAndParsePDF(item.pdfUrl);
      if (!result || result.text.trim().length < 100) {
        continue;
      }

      const hash = createHash("sha256").update(result.text).digest("hex");
      writeFileSync(txtPath, result.text, "utf-8");

      // Guardar PDF también
      try {
        const pdfRes = await fetch(item.pdfUrl, { headers: { "User-Agent": UA } });
        if (pdfRes.ok) writeFileSync(pdfPath, Buffer.from(await pdfRes.arrayBuffer()));
        await sleep(RATE_MS);
      } catch { /* PDF opcional */ }

      const entry: ManifiestoEntry = {
        tipo: "DDU",
        numero: item.numero,
        titulo: item.titulo,
        url_fuente: item.pdfUrl,
        fecha_descarga: new Date().toISOString(),
        hash,
        archivo: txtPath,
        chars: result.text.length,
        paginas: result.pages,
      };
      manifiesto[item.key] = entry;
      saveManifiesto(manifiesto);

      console.log(`✓ ${result.pages}p / ${result.text.length.toLocaleString()} chars`);
      descargados++;
      totalDescargados++;
    }

    console.log(`  Subtotal ${tipo}: ${descargados} nuevos, ${saltados} ya existentes`);
  }

  console.log(`\n  ✓ DDU totales: ${totalDescargados} descargados, ${totalSaltados} sin cambios`);
}
