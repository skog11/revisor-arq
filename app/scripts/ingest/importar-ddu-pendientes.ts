/**
 * importar-ddu-pendientes.ts
 * Agrega las 15 DDUs faltantes al manifiesto y las deja listas para ingestar.
 * Uso: tsx scripts/ingest/importar-ddu-pendientes.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const ROOT = join(__dirname, "../../..");
const DDU_DIR = join(ROOT, "NORMAS", "DDU");
const MANIFIESTO_PATH = join(ROOT, "corpus", "manifiesto.json");

type ManifiestoEntry = Record<string, unknown>;
const manifiesto: Record<string, ManifiestoEntry> = JSON.parse(readFileSync(MANIFIESTO_PATH, "utf-8"));

/** Extrae la línea MAT.: del texto para usar como título */
function extractTitulo(texto: string, numero: string): string {
  const lines = texto.split("\n");
  const matIdx = lines.findIndex(l => /^MAT\.:/.test(l.trim()));
  if (matIdx === -1) return `DDU ${numero}`;

  // Recoger hasta la línea que tenga solo mayúsculas (el "tema en cápsula")
  const matLines: string[] = [];
  for (let i = matIdx; i < Math.min(matIdx + 8, lines.length); i++) {
    const l = lines[i].trim();
    if (i > matIdx && /^[A-ZÁÉÍÓÚÑ\s;,:./°Nº0-9-]{10,}$/.test(l) && !l.startsWith("MAT")) break;
    if (l) matLines.push(l.replace(/^MAT\.:\s*/, ""));
  }
  const titulo = matLines.join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
  return `DDU ${numero}. ${titulo}`;
}

const DDU_NUMEROS = [
  "454", "467", "475", "478", "486", "487", "490",
  "492", "502", "512", "519", "520", "524", "536", "538"
];

let agregadas = 0;
let omitidas = 0;

for (const num of DDU_NUMEROS) {
  const clave = `DDU-${num}`;
  const archivo = join(DDU_DIR, `DDU-${num}.md`);

  if (!existsSync(archivo)) {
    console.log(`⚠️  ${clave}: archivo no encontrado`);
    omitidas++;
    continue;
  }

  if (manifiesto[clave]) {
    console.log(`⏭  ${clave}: ya existe en manifiesto`);
    omitidas++;
    continue;
  }

  const content = readFileSync(archivo, "utf-8");
  const hash = createHash("sha256").update(content).digest("hex");
  const titulo = extractTitulo(content, num);

  manifiesto[clave] = {
    tipo: "DDU",
    numero: num,
    titulo,
    url_fuente: `https://www.minvu.gob.cl/wp-content/uploads/2019/06/DDU-${num}.pdf`,
    fecha_descarga: new Date().toISOString(),
    hash,
    archivo,
    chars: content.length,
  };

  console.log(`+ ${clave}  (${content.length} chars) — ${titulo.slice(0, 80)}...`);
  agregadas++;
}

writeFileSync(MANIFIESTO_PATH, JSON.stringify(manifiesto, null, 2), "utf-8");
console.log("");
console.log(`✅ Agregadas:  ${agregadas}`);
console.log(`⏭  Omitidas:  ${omitidas}`);
console.log(`📦 Total manifiesto: ${Object.keys(manifiesto).length} normas`);
