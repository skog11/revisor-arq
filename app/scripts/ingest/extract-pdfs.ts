// Extrae texto de PDFs del corpus y genera archivos extraido.txt listos para ingesta.
//
// Escanea corpus/NN_*/ buscando:
//   - 03_metadatos/metadata.json  (numero, tipo, titulo, url)
//   - 01_fuente_oficial/*.pdf     (priorizados: sin "orig", sin "Modificacion")
//
// Por cada norma con PDF pero sin texto, genera 01_fuente_oficial/extraido.txt
//
// Uso:
//   npm run extract:pdfs           — extrae todos los pendientes
//   npm run extract:pdfs:dry       — muestra qué haría sin escribir
//   npm run extract:pdfs -- --force  — re-extrae aunque ya exista extraido.txt

import pdfParse from "pdf-parse";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename, resolve } from "path";

const CORPUS_ROOT = resolve(__dirname, "../../../corpus");
const PDF_IGNORE = ["orig", "Modificacion", "Reemplaza", "modifica"];

interface NormaMeta {
  titulo_oficial: string;
  nombre_corto: string;
  tipo_norma: string;
  numero: string;
  anio: string;
  organismo: string;
  url: string;
}

function parsearArgs() {
  const args = process.argv.slice(2);
  return { dry: args.includes("--dry"), force: args.includes("--force") };
}

// Busca recursivamente todos los metadata.json bajo corpus/NN_*/
function findMetadataFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      const full = join(dir, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }

      if (stat.isDirectory()) {
        walk(full);
      } else if (entry === "metadata.json" && dir.endsWith("03_metadatos")) {
        results.push(full);
      }
    }
  }

  // Solo procesar carpetas de categorias 01-12
  const catDirs = readdirSync(rootDir).filter((d) => /^\d{2}_/.test(d));
  for (const cat of catDirs) {
    walk(join(rootDir, cat));
  }

  return results;
}

function elegirMejorPDF(dir: string): string | null {
  let pdfs: string[];
  try {
    pdfs = readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => join(dir, f));
  } catch { return null; }

  if (pdfs.length === 0) return null;

  const filtrado = pdfs.filter(
    (p) => !PDF_IGNORE.some((pat) => basename(p).includes(pat))
  );
  const lista = filtrado.length > 0 ? filtrado : pdfs;

  // Preferir OCR
  const ocr = lista.find((p) => basename(p).toUpperCase().includes("OCR"));
  if (ocr) return ocr;

  // Fuentes reconocidas
  for (const fuente of ["BCN", "FAOLEX", "MMA", "MOP", "MINSAL", "DO"]) {
    const m = lista.find((p) => basename(p).includes(fuente));
    if (m) return m;
  }

  return lista[0];
}

async function main() {
  const { dry, force } = parsearArgs();

  console.log("\n📄 Extractor de PDFs — REVISOR ARQ");
  if (dry) console.log("   Modo DRY RUN");

  const metadataFiles = findMetadataFiles(CORPUS_ROOT);
  console.log(`   Normas encontradas en corpus (cat. 01-12): ${metadataFiles.length}\n`);

  let extraidos = 0;
  let omitidos = 0;
  let sinPDF = 0;
  let errores = 0;

  for (const metaPath of metadataFiles) {
    let meta: NormaMeta;
    try { meta = JSON.parse(readFileSync(metaPath, "utf-8")); }
    catch { continue; }

    // Subir dos niveles: 03_metadatos/metadata.json → norma/
    const normaDir = join(metaPath, "../..");
    const fuenteDir = join(normaDir, "01_fuente_oficial");
    const extractoPath = join(fuenteDir, "extraido.txt");

    const pdfPath = elegirMejorPDF(fuenteDir);
    const label = `${meta.tipo_norma} ${meta.numero}`.slice(0, 30).padEnd(30);

    if (!pdfPath) {
      sinPDF++;
      continue;
    }

    if (!force && existsSync(extractoPath)) {
      omitidos++;
      continue;
    }

    process.stdout.write(`  📄 ${label}...`);

    if (dry) {
      console.log(` [DRY] ${basename(pdfPath)}`);
      extraidos++;
      continue;
    }

    try {
      const buffer = readFileSync(pdfPath);
      const result = await pdfParse(buffer);
      const texto = result.text ?? "";

      if (texto.trim().length < 200) {
        console.log(` Advertencia: PDF sin texto útil (${texto.trim().length} chars) — omitido`);
        sinPDF++;
        continue;
      }

      const cabecera = [
        `NORMA: ${meta.titulo_oficial}`,
        `TIPO: ${meta.tipo_norma} ${meta.numero}`,
        `AÑO: ${meta.anio}`,
        `ORGANISMO: ${meta.organismo}`,
        `URL: ${meta.url}`,
        "=".repeat(50),
        "",
      ].join("\n");

      writeFileSync(extractoPath, cabecera + texto, "utf-8");
      console.log(` OK — ${Math.round(texto.length / 1000)}KB`);
      extraidos++;
    } catch (err) {
      console.log(` ERROR: ${(err as Error).message.slice(0, 80)}`);
      errores++;
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`  Extraídos:  ${extraidos}`);
  console.log(`  Omitidos:   ${omitidos}`);
  console.log(`  Sin PDF:    ${sinPDF}`);
  if (errores > 0) console.log(`  Errores:    ${errores}`);
  console.log("\n→ Siguiente paso: npm run manifiesto:build:dry");
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
