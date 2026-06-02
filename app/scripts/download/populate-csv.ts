import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { CGR_DICTAMENES } from "./download-cgr";

const CSV_PATH = join(__dirname, "..", "..", "..", "corpus", "cgr-harvesting-master.csv");

const content = readFileSync(CSV_PATH, "utf-8");
const lines = content.split("\n");
const headers = lines[0];
const existing = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(",");
  if (parts.length >= 2) {
    existing.add(`${parts[0]}-${parts[1]}`);
  }
}

let added = 0;
for (const d of CGR_DICTAMENES) {
  const key = `${d.numero}-${d.anio}`;
  if (!existing.has(key)) {
    const row = `${d.numero},${d.anio},,,,,${d.titulo},${d.materia},,,,,,,,,,,,,,,`;
    lines.push(row);
    added++;
  }
}

writeFileSync(CSV_PATH, lines.join("\n"));
console.log(`CSV poblado con ${added} dictámenes nuevos.`);
