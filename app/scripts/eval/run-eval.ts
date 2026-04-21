/**
 * Corre el set de evaluación contra la API de chat en producción o desarrollo.
 *
 * Uso:
 *   npm run eval                          # contra localhost:3000
 *   npm run eval -- --url=https://...    # contra producción
 *   npm run eval -- --caso=lguc-116      # un solo caso
 *
 * Salida: tabla en consola + guarda resultados en scripts/eval/resultados/YYYY-MM-DD.json
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { EVAL_SET, type EvalCase } from "./eval-set";

// ─── Config ───────────────────────────────────────────────────────────────────

function parsearArgs() {
  const args = process.argv.slice(2);
  return {
    baseUrl: args.find((a) => a.startsWith("--url="))?.split("=")[1] ?? "http://localhost:3000",
    casoId: args.find((a) => a.startsWith("--caso="))?.split("=")[1],
  };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ResultadoEval {
  id: string;
  pregunta: string;
  pasa: boolean;
  fuentes: number;
  frasesEsperadasEncontradas: string[];
  frasesEsperadasFaltantes: string[];
  frasesProhibidasEncontradas: string[];
  articulosCitados: string[];
  articulosEsperadosFaltantes: string[];
  respuesta: string;
  latenciaMs: number;
  error?: string;
}

// ─── Evaluar un caso ──────────────────────────────────────────────────────────

async function evalCaso(caso: EvalCase, baseUrl: string): Promise<ResultadoEval> {
  const t0 = Date.now();
  let respuesta = "";
  let fuentes = 0;
  let error: string | undefined;

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta: caso.pregunta, modo: caso.modo }),
    });

    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "fuentes") fuentes = event.data?.length ?? 0;
          else if (event.type === "chunk" && event.text) respuesta += event.text;
          else if (event.type === "error") error = event.message;
        } catch { /* ignorar */ }
      }
    }
  } catch (err) {
    error = (err as Error).message.slice(0, 100);
  }

  const latenciaMs = Date.now() - t0;
  const respLower = respuesta.toLowerCase();

  // ── Verificaciones ──
  const frasesEsperadasEncontradas = caso.frasesEsperadas.filter((f) =>
    respLower.includes(f.toLowerCase())
  );
  const frasesEsperadasFaltantes = caso.frasesEsperadas.filter(
    (f) => !respLower.includes(f.toLowerCase())
  );
  const frasesProhibidasEncontradas = (caso.frasesProhibidas ?? []).filter((f) =>
    respLower.includes(f.toLowerCase())
  );

  // Artículos citados: buscar patrones "Art. X", "artículo X", "Art X°"
  // Captura solo el número (y opcionalmente bis/ter/quinquies/°), sin incluir texto posterior
  const articulosCitados = [
    ...new Set(
      [
        // "artículo 116°", "artículo 116 bis", "artículo 116"
        ...respuesta.matchAll(/art[íi]culo[s]?\s+(\d+\s*(?:bis|ter|qu[aá]ter|quinquies)?)\s*[°º]?/gi),
        // "Art. 116" (forma corta con punto)
        ...respuesta.matchAll(/\bart\.\s*(\d+\s*(?:bis|ter|qu[aá]ter|quinquies)?)\s*[°º]?/gi),
      ].map((m) => m[1].trim().replace(/\s+/g, " ").toLowerCase())
    ),
  ];
  const articulosEsperadosFaltantes = caso.articulosEsperados.filter(
    (a) => !articulosCitados.some((c) => c.includes(a.toLowerCase()))
  );

  // ── Criterio de pase ──
  const pasa =
    !error &&
    frasesEsperadasFaltantes.length === 0 &&
    frasesProhibidasEncontradas.length === 0 &&
    articulosEsperadosFaltantes.length === 0 &&
    fuentes >= (caso.minFuentes ?? 0) &&
    respuesta.length > 50;

  return {
    id: caso.id,
    pregunta: caso.pregunta,
    pasa,
    fuentes,
    frasesEsperadasEncontradas,
    frasesEsperadasFaltantes,
    frasesProhibidasEncontradas,
    articulosCitados,
    articulosEsperadosFaltantes,
    respuesta: respuesta.slice(0, 800),
    latenciaMs,
    error,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { baseUrl, casoId } = parsearArgs();

  const casos = casoId
    ? EVAL_SET.filter((c) => c.id === casoId)
    : EVAL_SET;

  if (!casos.length) {
    console.error(`Caso "${casoId}" no encontrado`);
    process.exit(1);
  }

  console.log(`\n🧪 REVISOR ARQ — Evaluaciones`);
  console.log(`   URL: ${baseUrl}`);
  console.log(`   Casos: ${casos.length}\n`);

  const resultados: ResultadoEval[] = [];

  for (const caso of casos) {
    process.stdout.write(`  [${caso.id.padEnd(32)}] `);
    const r = await evalCaso(caso, baseUrl);
    resultados.push(r);

    const icon = r.pasa ? "✓" : "✗";
    const colorCode = r.pasa ? "\x1b[32m" : "\x1b[31m";
    console.log(
      `${colorCode}${icon}\x1b[0m  fuentes=${r.fuentes}  ${r.latenciaMs}ms${r.error ? `  ERROR: ${r.error}` : ""}`
    );

    if (!r.pasa && !r.error) {
      if (r.frasesEsperadasFaltantes.length)
        console.log(`     ✗ Frases faltantes: ${r.frasesEsperadasFaltantes.join(", ")}`);
      if (r.frasesProhibidasEncontradas.length)
        console.log(`     ✗ Frases prohibidas encontradas: ${r.frasesProhibidasEncontradas.join(", ")}`);
      if (r.articulosEsperadosFaltantes.length)
        console.log(`     ✗ Artículos no citados: ${r.articulosEsperadosFaltantes.join(", ")}`);
    }

    // Pequeña pausa entre casos
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ── Resumen ──
  const pasados = resultados.filter((r) => r.pasa).length;
  const fallados = resultados.length - pasados;
  const avgLatencia = Math.round(resultados.reduce((a, r) => a + r.latenciaMs, 0) / resultados.length);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Resultado: ${pasados}/${resultados.length} pasados  (${fallados} fallados)`);
  console.log(`  Latencia promedio: ${avgLatencia}ms`);

  // ── Guardar resultados ──
  const dir = join(__dirname, "resultados");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const fecha = new Date().toISOString().split("T")[0];
  const outPath = join(dir, `${fecha}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fecha: new Date().toISOString(),
        baseUrl,
        total: resultados.length,
        pasados,
        fallados,
        avgLatenciaMs: avgLatencia,
        casos: resultados,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\n  Resultados guardados en: scripts/eval/resultados/${fecha}.json`);

  if (fallados > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
