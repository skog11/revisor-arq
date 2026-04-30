// Escanea corpus/NN_*/ y añade entradas nuevas al manifiesto.json
// para cada norma que tenga 01_fuente_oficial/extraido.txt.
//
// Uso:
//   npm run manifiesto:build          — añade entradas nuevas
//   npm run manifiesto:build:dry      — muestra qué añadiría sin modificar

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";

const CORPUS_ROOT = resolve(__dirname, "../../../corpus");
const MANIFIESTO_PATH = join(CORPUS_ROOT, "manifiesto.json");

type TipoNorma = "LGUC" | "OGUC" | "DDU" | "DDU_ESPECIFICA" | "LEY" | "DFL" | "DL" | "DS";

interface ManifiestoEntry {
  tipo: TipoNorma;
  archivo: string;
  url_fuente: string;
  titulo: string;
  fecha_publicacion?: string;
}

interface CorpusMeta {
  titulo_oficial: string;
  nombre_corto: string;
  tipo_norma: string;
  numero: string;
  anio: string;
  organismo: string;
  url: string;
}

function parsearArgs() {
  return { dry: process.argv.includes("--dry") };
}

function inferirTipo(tipoStr: string): TipoNorma {
  const t = tipoStr.toUpperCase();
  if (t.includes("DFL") || t.includes("DECRETO CON FUERZA")) return "DFL";
  if (t.includes("DL") || t.includes("DECRETO LEY")) return "DL";
  if (t.includes("DS") || t.includes("DECRETO SUPREMO")) return "DS";
  return "LEY";
}

function findMetadataFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) walk(full);
      else if (entry === "metadata.json" && dir.endsWith("03_metadatos")) {
        results.push(full);
      }
    }
  }

  const cats = readdirSync(rootDir).filter((d) => /^\d{2}_/.test(d));
  for (const cat of cats) walk(join(rootDir, cat));
  return results;
}

function main() {
  const { dry } = parsearArgs();

  console.log("\n📋 Builder de manifiesto — REVISOR ARQ");
  if (dry) console.log("   Modo DRY RUN");

  let manifiesto: Record<string, ManifiestoEntry> = {};
  if (existsSync(MANIFIESTO_PATH)) {
    manifiesto = JSON.parse(readFileSync(MANIFIESTO_PATH, "utf-8"));
  }
  console.log(`   Entradas actuales en manifiesto: ${Object.keys(manifiesto).length}`);

  const metadataFiles = findMetadataFiles(CORPUS_ROOT);
  console.log(`   Normas en corpus (cat. 01-12): ${metadataFiles.length}\n`);

  let añadidas = 0;
  let omitidas = 0;
  let sinTexto = 0;

  for (const metaPath of metadataFiles) {
    let meta: CorpusMeta;
    try { meta = JSON.parse(readFileSync(metaPath, "utf-8")); }
    catch { continue; }

    const normaDir = join(metaPath, "../..");
    const extractoPath = join(normaDir, "01_fuente_oficial", "extraido.txt");

    if (!existsSync(extractoPath)) {
      sinTexto++;
      continue;
    }

    const tipo = inferirTipo(meta.tipo_norma);
    const key = `${tipo}-${meta.numero}`;

    if (manifiesto[key]) {
      omitidas++;
      continue;
    }

    const entry: ManifiestoEntry = {
      tipo,
      archivo: extractoPath,
      url_fuente: meta.url || "https://www.bcn.cl/leychile/",
      titulo: meta.titulo_oficial,
      fecha_publicacion: meta.anio ? `${meta.anio}-01-01` : undefined,
    };

    if (dry) {
      console.log(`  + [${key}] ${meta.titulo_oficial.slice(0, 60)}`);
    } else {
      manifiesto[key] = entry;
      console.log(`  + [${key}] ${meta.titulo_oficial.slice(0, 50)}`);
    }
    añadidas++;
  }

  if (!dry && añadidas > 0) {
    writeFileSync(MANIFIESTO_PATH, JSON.stringify(manifiesto, null, 2), "utf-8");
    console.log(`\n  Manifiesto actualizado: ${Object.keys(manifiesto).length} entradas totales`);
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`  Nuevas:       ${añadidas}`);
  console.log(`  Ya existían:  ${omitidas}`);
  console.log(`  Sin texto:    ${sinTexto} (ejecuta extract:pdfs primero)`);

  if (añadidas > 0 && !dry) {
    console.log("\n→ Siguiente paso: npm run corpus:ingest");
  }
}

main();
