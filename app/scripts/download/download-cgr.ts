/**
 * Descargador de dictámenes CGR (Contraloría General de la República).
 *
 * Estrategia de descarga:
 *   1. Busca en la API Elasticsearch de CGR:
 *      POST https://www.contraloria.cl/apibusca/search/dictamenes
 *   2. Filtra el hit por número + año (formato ID: "008518N06" = dictamen 8518, año 2006).
 *   3. Extrae `documento_completo` del hit encontrado.
 *   4. Guarda en corpus/CGR/{NRO}_{AÑO}.txt
 *   5. Registra en corpus/manifiesto.json (para que ingest.ts lo detecte).
 *
 * Uso:
 *   npm run corpus:cgr
 *   npm run corpus:cgr -- --solo=CGR-8518-2006
 *   npm run corpus:cgr -- --force
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { loadManifiesto, saveManifiesto, CORPUS_ROOT } from "./manifiesto";

const CGR_DIR = join(CORPUS_ROOT, "CGR");
const CGR_API_URL = "https://www.contraloria.cl/apibusca/search/dictamenes";

// ─── Catálogo curado de dictámenes clave ─────────────────────────────────────

export interface CGRDictamenMeta {
  numero: string;   // "8518" o "E14360"
  anio: string;     // "2006"
  titulo: string;   // descripción breve
  materia: string;  // norma que interpreta ("OGUC", "LGUC", etc.)
}

export const CGR_DICTAMENES: CGRDictamenMeta[] = [
  {
    numero: "8518",
    anio: "2006",
    titulo: "Conjunto armónico: improcedencia en obras con recepción definitiva municipal",
    materia: "OGUC",
  },
  {
    numero: "E14360",
    anio: "2025",
    titulo: "DDU 490 dejada sin efecto — complejos fronterizos (DDU 519 vigente)",
    materia: "DDU",
  },
  // ── Agregar más dictámenes aquí según prioridad ──────────────────────────
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildKey(d: CGRDictamenMeta): string {
  return `CGR-${d.numero}-${d.anio}`;
}

function buildArchivePath(d: CGRDictamenMeta): string {
  return join(CGR_DIR, `${d.numero}_${d.anio}.txt`);
}

function limpiarHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xF3;/g, "ó")
    .replace(/&#xE1;/g, "á")
    .replace(/&#xE9;/g, "é")
    .replace(/&#xED;/g, "í")
    .replace(/&#xFA;/g, "ú")
    .replace(/&#xF1;/g, "ñ")
    .replace(/&#xC1;/g, "Á")
    .replace(/&#xC9;/g, "É")
    .replace(/&#xCD;/g, "Í")
    .replace(/&#xD3;/g, "Ó")
    .replace(/&#xDA;/g, "Ú")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x201C;/g, '"')
    .replace(/&#x201D;/g, '"')
    .replace(/\s{4,}/g, "\n\n")
    .replace(/[ \t]{3,}/g, " ")
    .trim();
}

// ─── API CGR ──────────────────────────────────────────────────────────────────

interface CGRAPIBody {
  search: string;
  exact_search: boolean;
  options: { type: string; field: string; value: string }[];
  order: string;
  date_name: string;
  source: string;
  page: number;
}

interface CGRAPIHit {
  _id: string;
  _score: number;
  _source: {
    numero_dictamen?: string;
    numero?: string;
    anio?: string;
    fecha_documento?: string;
    documento_completo?: string;
    materia_raw?: string;
    destinatarios?: string;
    fuentes_legales?: string;
    old_url?: string;
  };
}

interface CGRAPIResponse {
  hits?: {
    hits?: CGRAPIHit[];
    total?: { value: number } | number;
  };
}

async function buscarEnAPICGR(
  numero: string,
  anio: string
): Promise<CGRAPIHit | null> {
  const body: CGRAPIBody = {
    search: numero,
    exact_search: false,
    options: [],
    order: "score",
    date_name: "",
    source: "dictamenes",
    page: 0,
  };

  try {
    const res = await fetch(CGR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RevisorARQ/1.0)",
        "Referer": "https://www.contraloria.cl/",
        "Origin": "https://www.contraloria.cl",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.warn(`  [warn] API CGR HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as CGRAPIResponse;
    const hits = data?.hits?.hits ?? [];

    if (hits.length === 0) {
      console.warn(`  [warn] Sin resultados en API CGR para ${numero}/${anio}`);
      return null;
    }

    // ID format: "{NUM_PADDED}N{2-digit-year}" → "008518N06" o "E14360N25"
    const yearSuffix = `N${anio.slice(-2)}`.toUpperCase();
    const normalNum = numero.replace(/^0+/, "").toUpperCase();

    // Buscar hit que coincida con número + año
    const exact = hits.find((h) => {
      const id = h._id.toUpperCase();
      return id.endsWith(yearSuffix) && id.replace(/N\d+$/, "").replace(/^0+/, "") === normalNum;
    });

    if (exact) {
      console.log(`         Hit: ${exact._id} (score=${exact._score.toFixed(2)})`);
      return exact;
    }

    // Fallback: buscar por año en fecha_documento
    const byYear = hits.find((h) => (h._source.fecha_documento ?? "").startsWith(anio));
    if (byYear) {
      console.log(`         Hit por fecha: ${byYear._id}`);
      return byYear;
    }

    console.warn(`  [warn] Hits encontrados pero ninguno coincide con ${numero}/${anio}:`);
    hits.forEach((h) => console.warn(`    - ${h._id} (${(h._source.fecha_documento ?? "?").slice(0, 10)})`));
    return null;
  } catch (err) {
    console.warn(`  [warn] Error en API CGR: ${(err as Error).message}`);
    return null;
  }
}

function extraerTextoDeHit(hit: CGRAPIHit, numero: string, anio: string): string | null {
  const src = hit._source;

  // Preferir documento_completo (texto más completo)
  for (const campo of [src.documento_completo, src.materia_raw, src.destinatarios]) {
    if (!campo) continue;
    const texto = limpiarHTML(campo);
    if (texto.length >= 200) {
      // Agregar encabezado estándar si no viene incluido
      if (!texto.includes(`${numero}`) && !texto.toLowerCase().includes("dictamen")) {
        return `DICTAMEN N° ${numero} - ${anio}\n\n${texto}`;
      }
      return texto;
    }
  }

  return null;
}

// ─── Descarga principal ───────────────────────────────────────────────────────

async function descargarDictamen(
  d: CGRDictamenMeta,
  opts: { force: boolean }
): Promise<boolean> {
  const key = buildKey(d);
  const archivePath = buildArchivePath(d);
  const manifiesto = loadManifiesto();

  if (!opts.force && existsSync(archivePath) && manifiesto[key]) {
    console.log(`  [skip] ${key} — ya existe (${manifiesto[key].chars} chars)`);
    return true;
  }

  console.log(`  [desc] ${key} — ${d.titulo}`);

  const hit = await buscarEnAPICGR(d.numero, d.anio);
  if (!hit) {
    console.error(`  [fail] ${key} — no encontrado en API CGR`);
    return false;
  }

  const texto = extraerTextoDeHit(hit, d.numero, d.anio);
  if (!texto || texto.length < 200) {
    console.error(`  [fail] ${key} — texto insuficiente (${texto?.length ?? 0} chars)`);
    return false;
  }

  const url_fuente =
    hit._source.old_url ??
    `https://www.contraloria.cl/web/cgr/busqueda-de-dictamenes?numero=${d.numero}&anio=${d.anio}`;

  writeFileSync(archivePath, texto, "utf-8");
  console.log(`  [ok]   ${key} — ${texto.length} chars`);

  // Registrar en manifiesto principal (para ingest.ts)
  const hash = createHash("sha256").update(texto).digest("hex");
  const updatedManifiesto = loadManifiesto();
  updatedManifiesto[key] = {
    tipo: "CGR",
    numero: `${d.numero}-${d.anio}`,
    titulo: d.titulo,
    url_fuente,
    fecha_descarga: new Date().toISOString().split("T")[0],
    hash,
    archivo: archivePath,
    chars: texto.length,
  };
  saveManifiesto(updatedManifiesto);

  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(CGR_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const soloKey = args.find((a) => a.startsWith("--solo="))?.split("=")[1];
  const force = args.includes("--force");

  const lista = soloKey
    ? CGR_DICTAMENES.filter((d) => buildKey(d) === soloKey || buildKey(d) === `CGR-${soloKey}`)
    : CGR_DICTAMENES;

  if (lista.length === 0) {
    console.error(`No se encontró el dictamen: ${soloKey}`);
    process.exit(1);
  }

  console.log(`\n── Descargando ${lista.length} dictámenes CGR (API) ──────────────\n`);

  let ok = 0;
  let fail = 0;

  for (const d of lista) {
    const exito = await descargarDictamen(d, { force });
    if (exito) ok++;
    else fail++;
    if (lista.length > 1) await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n── Resultado: ${ok} ok · ${fail} fallidos ──────────────────────`);

  if (fail > 0) {
    console.log(`
Los dictámenes fallidos deben ingresarse manualmente:
1. Busca en https://www.contraloria.cl/web/cgr/busqueda-de-dictamenes
2. Copia el texto completo del dictamen
3. Guárdalo en corpus/CGR/{NUMERO}_{AÑO}.txt
4. Ejecuta: npm run corpus:ingest -- --solo=CGR-{NUMERO}-{AÑO} --force
`);
    process.exit(1);
  } else {
    console.log(`\nListo. Ejecuta: npm run corpus:ingest\n`);
  }
}

main().catch(console.error);
