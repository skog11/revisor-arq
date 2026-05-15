/**
 * Script de Alerta Normativa — REVISOR ARQ
 * Monitorea cambios en la BCN para las normas core.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (RevisorArq/1.0)";
const STATE_FILE = resolve(__dirname, "state.json");

interface TrackedNorm {
  id: string;
  name: string;
  key: string;
}

const TRACKED: TrackedNorm[] = [
  { id: "13560", key: "LGUC", name: "Ley General de Urbanismo y Construcciones (DFL-458)" },
  { id: "8201",  key: "OGUC", name: "Ordenanza General de Urbanismo y Construcciones (DS-47)" },
  { id: "30006", key: "LEY-19300", name: "Bases Generales del Medio Ambiente (Ley 19.300)" },
  { id: "250481", key: "LEY-21442", name: "Ley de Copropiedad Inmobiliaria (Ley 21.442)" },
];

async function detectVersionDate(idNorma: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}`, {
      headers: { "User-Agent": UA },
    });
    const html = await res.text();
    const match = html.match(/hddResultadoExportar=\d+\.(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  } catch (err) {
    console.error(`Error detectando versión para ${idNorma}:`, (err as Error).message);
    return null;
  }
}

function loadState(): Record<string, string> {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(state: Record<string, string>) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function main() {
  console.log("🔍 Verificando actualizaciones en BCN...");
  const state = loadState();
  let changesDetected = 0;
  const reports: string[] = [];

  for (const norm of TRACKED) {
    process.stdout.write(`  - ${norm.name}... `);
    const currentDate = await detectVersionDate(norm.id);
    
    if (!currentDate) {
      console.log("❌ Error");
      continue;
    }

    const lastDate = state[norm.key];
    if (lastDate && lastDate !== currentDate) {
      console.log(`🔔 ¡CAMBIO DETECTADO! (${lastDate} -> ${currentDate})`);
      reports.push(`[ALERTA] ${norm.name} ha sido actualizada. Nueva versión: ${currentDate}.`);
      changesDetected++;
    } else {
      console.log(`✅ OK (${currentDate})`);
    }

    state[norm.key] = currentDate;
  }

  saveState(state);

  if (changesDetected > 0) {
    console.log("\n⚠️ Se detectaron cambios normativos:");
    console.log(reports.join("\n"));
    // En un entorno de CI, esto fallaría el action o enviaría un email.
    process.exit(0); 
  } else {
    console.log("\n✨ No hay cambios detectados.");
  }
}

main().catch((err) => {
  console.error("Error fatal en scraper:", err);
  process.exit(1);
});
