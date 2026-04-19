/**
 * Orquestador: descarga completa del corpus (LGUC + OGUC + DDU).
 * Uso: npm run corpus:download
 *      npm run corpus:download -- --force
 *      npm run corpus:download -- --solo-bcn
 *      npm run corpus:download -- --solo-ddu --ddu-desde=2018 --ddu-hasta=2024
 */
import { downloadBCN } from "./download-bcn";
import { downloadDDUs } from "./download-ddu";
import { loadManifiesto } from "./manifiesto";

const args = process.argv.slice(2);
const force = args.includes("--force");
const soloBCN = args.includes("--solo-bcn");
const soloDDU = args.includes("--solo-ddu");

function parseArg(name: string): number | undefined {
  const a = args.find((a) => a.startsWith(`--${name}=`));
  return a ? parseInt(a.split("=")[1]) : undefined;
}

const dduDesde = parseArg("ddu-desde");
const dduHasta = parseArg("ddu-hasta");
const dduLimite = parseArg("ddu-limite") ?? 50;

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  REVISOR ARQ — Descarga del corpus");
  console.log("═══════════════════════════════════════════");
  console.log(`  Modo: ${force ? "forzar re-descarga" : "incremental (solo cambios)"}`);
  console.log();

  const start = Date.now();

  try {
    if (!soloDDU) {
      await downloadBCN(force);
    }

    if (!soloBCN) {
      await downloadDDUs({
        desde: dduDesde,
        hasta: dduHasta,
        limite: dduLimite,
        forceUpdate: force,
      });
    }
  } catch (err) {
    console.error("\n✗ Error fatal en descarga:", (err as Error).message);
    process.exit(1);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const manifiesto = loadManifiesto();
  const total = Object.keys(manifiesto).length;

  console.log("\n═══════════════════════════════════════════");
  console.log(`  ✓ Descarga completada en ${elapsed}s`);
  console.log(`  Archivos en manifiesto: ${total}`);
  console.log("  Ejecuta: npm run corpus:verify");
  console.log("═══════════════════════════════════════════");
}

main();
