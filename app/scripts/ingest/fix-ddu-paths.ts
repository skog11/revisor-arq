/**
 * fix-ddu-paths.ts
 * Corrige las entradas del manifiesto que tienen paths incorrectos o relativos,
 * apuntándolos a los archivos .md correctos en NORMAS/DDU/.
 * Uso: tsx scripts/ingest/fix-ddu-paths.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";

// __dirname = app/scripts/ingest/ → 3 niveles arriba = raíz del proyecto
const ROOT = resolve(join(__dirname, "../../.."));
const DDU_MD_DIR = join(ROOT, "NORMAS", "DDU");
const MANIFIESTO_PATH = join(ROOT, "corpus", "manifiesto.json");

const manifiesto: Record<string, Record<string, unknown>> = JSON.parse(
  readFileSync(MANIFIESTO_PATH, "utf-8")
);

const toFix = [
  "DDU-467", "DDU-478", "DDU-487", "DDU-519",
  "DDU-475", "DDU-492", "DDU-502", "DDU-512",
  "DDU-520", "DDU-524", "DDU-536", "DDU-538",
];

let fixed = 0;
let missing = 0;

for (const clave of toFix) {
  const mdFile = join(DDU_MD_DIR, `${clave}.md`);
  if (!existsSync(mdFile)) {
    console.log(`⚠️  No encontrado: ${mdFile}`);
    missing++;
    continue;
  }
  const content = readFileSync(mdFile, "utf-8");
  const hash = createHash("sha256").update(content).digest("hex");

  if (!manifiesto[clave]) {
    console.log(`⚠️  ${clave}: no existe en manifiesto`);
    continue;
  }

  const oldPath = manifiesto[clave].archivo as string;
  manifiesto[clave].archivo = mdFile;
  manifiesto[clave].hash = hash;
  manifiesto[clave].chars = content.length;

  console.log(`✅ ${clave}: ${oldPath.slice(-30)} → ...${mdFile.slice(-40)} (${content.length} chars)`);
  fixed++;
}

writeFileSync(MANIFIESTO_PATH, JSON.stringify(manifiesto, null, 2), "utf-8");
console.log("");
console.log(`✅ Corregidos: ${fixed}`);
console.log(`⚠️  No encontrados: ${missing}`);
