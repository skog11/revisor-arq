/**
 * Descargador de dictámenes CGR (Contraloría General de la República).
 *
 * Estrategia de descarga:
 *   1. Intenta HTML desde el buscador CGR:
 *      https://www.contraloria.cl/pdfbusqueda/Informes.nsf/BDictamenes/{NRO}_{AÑO}?OpenDocument
 *   2. Fallback: PDF directo (requiere pdfjs-dist para extracción de texto).
 *
 * Uso:
 *   npx ts-node -P tsconfig.scripts.json scripts/download/download-cgr.ts
 *   npx ts-node -P tsconfig.scripts.json scripts/download/download-cgr.ts --solo=8518_2006
 *
 * Los archivos se guardan en corpus/CGR/{NRO}_{AÑO}.txt
 * Luego ejecutar: npm run corpus:ingest
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CORPUS_ROOT = join(__dirname, "../../corpus");
const CGR_DIR = join(CORPUS_ROOT, "CGR");
const CGR_MANIFIESTO_PATH = join(CORPUS_ROOT, "cgr-manifiesto.json");

// ─── Catálogo curado de dictámenes clave ─────────────────────────────────────
//
// Prioridad 1 — ya referenciados en motor-reglas.ts:
//   8518/2006  — Conjunto armónico: improcede en obras con recepción definitiva
//   E14360/2025 — DDU 490 dejada sin efecto (complejos fronterizos)
//
// Prioridad 2 — agregar progresivamente según necesidades del corpus:
//   Consultar https://www.contraloria.cl/pdfbusqueda/Busqueda.nsf
//   Buscar por materia: "conjunto armónico", "artículo 55 LGUC", "rasante", etc.

export interface CGRDictamenMeta {
  numero: string;      // "8518" o "E14360"
  anio: string;        // "2006"
  titulo: string;      // descripción breve de la materia
  materia: string;     // norma que interpreta ("OGUC", "LGUC", etc.)
  url_fuente: string;  // URL canónica del dictamen en CGR
}

export const CGR_DICTAMENES: CGRDictamenMeta[] = [
  {
    numero: "8518",
    anio: "2006",
    titulo: "Conjunto armónico: improcedencia en obras con recepción definitiva municipal",
    materia: "OGUC",
    url_fuente: "https://www.contraloria.cl/pdfbusqueda/Informes.nsf/BDictamenes/8518_2006?OpenDocument",
  },
  {
    numero: "E14360",
    anio: "2025",
    titulo: "DDU 490 dejada sin efecto — complejos fronterizos (DDU 519 vigente)",
    materia: "DDU",
    url_fuente: "https://www.contraloria.cl/pdfbusqueda/Informes.nsf/BDictamenes/E14360_2025?OpenDocument",
  },
  // ── Agregar más dictámenes aquí según prioridad ──────────────────────────
  // Ejemplo:
  // {
  //   numero: "79082",
  //   anio: "2014",
  //   titulo: "Permiso de obra menor vs obra mayor — art. 116 LGUC",
  //   materia: "LGUC",
  //   url_fuente: "https://www.contraloria.cl/pdfbusqueda/Informes.nsf/BDictamenes/79082_2014?OpenDocument",
  // },
];

// ─── Manifiesto CGR ───────────────────────────────────────────────────────────

interface CGRManifiesto {
  [key: string]: CGRDictamenMeta & {
    archivo: string;
    fecha_descarga: string;
    chars: number;
  };
}

function loadManifiesto(): CGRManifiesto {
  if (!existsSync(CGR_MANIFIESTO_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CGR_MANIFIESTO_PATH, "utf-8")) as CGRManifiesto;
  } catch {
    return {};
  }
}

function saveManifiesto(m: CGRManifiesto): void {
  writeFileSync(CGR_MANIFIESTO_PATH, JSON.stringify(m, null, 2), "utf-8");
}

// ─── Descargador ─────────────────────────────────────────────────────────────

function buildKey(d: CGRDictamenMeta): string {
  return `CGR-${d.numero}-${d.anio}`;
}

function buildArchivePath(d: CGRDictamenMeta): string {
  return join(CGR_DIR, `${d.numero}_${d.anio}.txt`);
}

async function descargarHTML(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RevisorARQ/1.0; +https://revisor-arq.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.warn(`  [warn] HTTP ${res.status} para ${url}`);
      return null;
    }

    const html = await res.text();

    // Extraer texto del cuerpo del dictamen (Lotus Notes Domino / CGR SPA)
    // El contenido suele estar en un <div> con clase "body" o en <pre>
    const textoExtraido = extraerTextoCGR(html);
    return textoExtraido;
  } catch (err) {
    console.warn(`  [warn] Error descargando ${url}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Extrae el texto del dictamen del HTML de CGR.
 * CGR usa Lotus Domino con una estructura predecible.
 */
function extraerTextoCGR(html: string): string | null {
  // Intentar múltiples estrategias de extracción

  // Estrategia 1: Contenido entre etiquetas de sección Domino
  const matchDomino = html.match(
    /<(?:div|table)[^>]*class="[^"]*(?:body|content|dictamen)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|table)>/i
  );
  if (matchDomino) {
    return limpiarHTML(matchDomino[1]);
  }

  // Estrategia 2: Buscar el texto del dictamen entre marcadores conocidos
  const matchContenido = html.match(
    /(?:DICTAMEN\s+N[°º]?\s*\d+[\s\S]*?)(?=<\/(?:body|html|div)>)/i
  );
  if (matchContenido) {
    return limpiarHTML(matchContenido[0]);
  }

  // Estrategia 3: Extraer todo el texto visible eliminando HTML
  const textoCompleto = limpiarHTML(html);
  if (textoCompleto.toLowerCase().includes("dictamen") && textoCompleto.length > 200) {
    return textoCompleto;
  }

  return null;
}

function limpiarHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

async function descargarDictamen(
  d: CGRDictamenMeta,
  manifiesto: CGRManifiesto
): Promise<boolean> {
  const key = buildKey(d);
  const archivePath = buildArchivePath(d);

  // Ya descargado
  if (existsSync(archivePath) && manifiesto[key]) {
    console.log(`  [skip] ${key} — ya existe`);
    return true;
  }

  console.log(`  [desc] ${key} — ${d.titulo}`);
  console.log(`         URL: ${d.url_fuente}`);

  const texto = await descargarHTML(d.url_fuente);

  if (!texto || texto.length < 200) {
    console.error(`  [fail] ${key} — texto insuficiente o no descargado`);
    console.error(`         Descarga manual: ${d.url_fuente}`);
    console.error(`         Guarda el texto en: ${archivePath}`);
    return false;
  }

  writeFileSync(archivePath, texto, "utf-8");
  manifiesto[key] = {
    ...d,
    archivo: `CGR/${d.numero}_${d.anio}.txt`,
    fecha_descarga: new Date().toISOString().split("T")[0],
    chars: texto.length,
  };

  console.log(`  [ok]   ${key} — ${texto.length} chars`);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(CGR_DIR, { recursive: true });
  const manifiesto = loadManifiesto();

  const args = process.argv.slice(2);
  const soloKey = args.find((a) => a.startsWith("--solo="))?.split("=")[1];

  const lista = soloKey
    ? CGR_DICTAMENES.filter((d) => buildKey(d) === `CGR-${soloKey}`)
    : CGR_DICTAMENES;

  if (lista.length === 0) {
    console.error(`No se encontró el dictamen: ${soloKey}`);
    process.exit(1);
  }

  console.log(`\n── Descargando ${lista.length} dictámenes CGR ─────────────────\n`);

  let ok = 0;
  let fail = 0;

  for (const d of lista) {
    const exito = await descargarDictamen(d, manifiesto);
    if (exito) ok++;
    else fail++;
    await new Promise((r) => setTimeout(r, 1500)); // pausa entre requests
  }

  saveManifiesto(manifiesto);

  console.log(`\n── Resultado: ${ok} ok · ${fail} fallidos ──────────────────────`);

  if (fail > 0) {
    console.log(`
Los dictámenes fallidos deben descargarse manualmente:
1. Abre la URL indicada en un navegador
2. Copia el texto completo del dictamen
3. Guárdalo en corpus/CGR/{NUMERO}_{AÑO}.txt
4. Ejecuta nuevamente: npx ts-node scripts/download/download-cgr.ts

Luego ingestar: cd app && npm run corpus:ingest
`);
  } else {
    console.log(`\nListo. Ejecuta: cd app && npm run corpus:ingest\n`);
  }
}

main().catch(console.error);
