/**
 * Verifica integridad del corpus descargado.
 * Uso: npm run corpus:verify
 */
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { loadManifiesto } from "./manifiesto";

const MIN_CHARS: Record<string, number> = {
  LGUC: 50_000,
  OGUC: 100_000,
  DDU: 500,
};

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  REVISOR ARQ — Verificación del corpus");
  console.log("═══════════════════════════════════════════\n");

  const manifiesto = loadManifiesto();
  const keys = Object.keys(manifiesto);

  if (keys.length === 0) {
    console.log("  ⚠  Manifiesto vacío. Ejecuta: npm run corpus:download");
    process.exit(1);
  }

  let ok = 0;
  let errores = 0;
  const problemas: string[] = [];

  for (const key of keys) {
    const entry = manifiesto[key];
    const tipo = entry.tipo;
    const minChars = MIN_CHARS[tipo] ?? 500;

    process.stdout.write(`  ${key.padEnd(12)} `);

    // 1. Archivo existe
    if (!existsSync(entry.archivo)) {
      console.log(`✗ Archivo no encontrado: ${entry.archivo}`);
      problemas.push(`${key}: archivo faltante`);
      errores++;
      continue;
    }

    // 2. Hash coincide
    const texto = readFileSync(entry.archivo, "utf-8");
    const hash = createHash("sha256").update(texto).digest("hex");
    if (hash !== entry.hash) {
      console.log(`✗ Hash no coincide (archivo modificado externamente)`);
      problemas.push(`${key}: hash inválido`);
      errores++;
      continue;
    }

    // 3. Longitud mínima
    if (texto.length < minChars) {
      console.log(`✗ Texto demasiado corto: ${texto.length} chars (mínimo ${minChars})`);
      problemas.push(`${key}: texto insuficiente (${texto.length} chars)`);
      errores++;
      continue;
    }

    console.log(`✓ ${texto.length.toLocaleString()} chars  |  ${new Date(entry.fecha_descarga).toLocaleDateString("es-CL")}`);
    ok++;
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Resultado: ${ok} OK, ${errores} con problemas`);

  if (problemas.length > 0) {
    console.log("\n  Problemas detectados:");
    for (const p of problemas) console.log(`    - ${p}`);
    console.log("\n  Consulta docs/corpus.md para instrucciones de corrección manual.");
    process.exit(1);
  } else {
    console.log("  ✓ Corpus listo para ingesta.");
    console.log("  Siguiente paso: npm run corpus:ingest");
  }

  console.log("═══════════════════════════════════════════");
}

main();
