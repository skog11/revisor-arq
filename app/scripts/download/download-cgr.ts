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

  // ── Art. 55 LGUC — loteo y subdivisión rural ─────────────────────────────
  {
    numero: "9443",
    anio: "2000",
    titulo: "DOM sin competencia para autorizar subdivisiones de predios rurales — Art. 55 LGUC",
    materia: "LGUC",
  },
  {
    numero: "2663",
    anio: "2003",
    titulo: "DOM sin atribución para cambio de uso de suelo en terrenos rurales — Art. 55 LGUC",
    materia: "LGUC",
  },

  // ── OGUC — demolición ────────────────────────────────────────────────────
  {
    numero: "27507",
    anio: "2009",
    titulo: "Permiso de demolición requerido, salvo que esté incluido en el permiso de edificación del nuevo proyecto",
    materia: "OGUC",
  },

  // ── Ley 19.300 — SEIA y recepción definitiva ─────────────────────────────
  {
    numero: "23683",
    anio: "2017",
    titulo: "Municipalidades deben exigir RCA favorable para otorgar recepción definitiva",
    materia: "LEY-19300",
  },

  // ── Ley 17.288 — Zona Típica ─────────────────────────────────────────────
  {
    numero: "3272",
    anio: "2020",
    titulo: "Obra nueva fuera de zona típica y pintoresca no requiere autorización del CMN",
    materia: "LEY-17288",
  },

  // ── Art. 55 LGUC — organismo competente para informe rural ───────────────
  {
    numero: "30457",
    anio: "2016",
    titulo: "Organismo competente para emitir informe previo favorable en construcciones rurales — Art. 55 inc. final LGUC",
    materia: "LGUC",
  },

  // ── Ley 19.300 — SEIA en áreas de preservación ecológica (IPT) ──────────
  {
    numero: "E39766",
    anio: "2020",
    titulo: "Áreas de preservación ecológica en IPT constituyen áreas bajo protección oficial para efectos del SEIA (Art. 10 letra p Ley 19.300)",
    materia: "LEY-19300",
  },

  // ── Art. 55 LGUC + DL 3.516 — predios rústicos y autorizaciones rurales ──
  {
    numero: "E422376",
    anio: "2023",
    titulo: "Predios subdivididos bajo DL 3.516 quedan sujetos a prohibición de cambio de destino del Art. 55 LGUC — DOM debe exigir autorizaciones SEREMI + SAG",
    materia: "LGUC",
  },

  // ── Ley 19.300 — SEIA y permisos de edificación (caso factibilidad + sombras)
  {
    numero: "90563",
    anio: "2016",
    titulo: "Permiso de edificación, factibilidad de servicios, proyección de sombras y evaluación ambiental — alcance de la DOM al otorgar permisos",
    materia: "LEY-19300",
  },

  // ── LGUC Art. 116 — ITO y control de calidad de obras ────────────────────
  {
    numero: "32846",
    anio: "2019",
    titulo: "Juridicidad de permisos de edificación: medidas de gestión, control de calidad e inspector técnico de obras (ITO) en edificios de uso público",
    materia: "LGUC",
  },

  // ── LGUC Art. 116 — vigencia de anteproyectos ────────────────────────────
  {
    numero: "32357",
    anio: "2006",
    titulo: "Vigencia del anteproyecto de loteo, edificación o urbanización: normas aplicables y plazo para obtener permiso definitivo (Art. 116 inc. 8 LGUC)",
    materia: "LGUC",
  },

  // ── LGUC Art. 116 — campamentos con contenedores habitacionales ──────────
  {
    numero: "29101",
    anio: "2006",
    titulo: "Campamentos provisorios con contenedores habitacionales constituyen 'recintos habitables' según OGUC y requieren permiso de edificación y derechos municipales",
    materia: "LGUC",
  },

  // ── Ley 19.300 — DDU 443 y solicitudes de pertinencia SEIA ante DOM ──────
  {
    numero: "E126162",
    anio: "2021",
    titulo: "DDU N° 443 (circular 411/2020): no corresponde que la DOM exija solicitudes de pertinencia SEIA — coordinación entre permisos urbanísticos y calificación ambiental",
    materia: "LEY-19300",
  },

  // ── LGUC — revisor independiente obligatorio en permisos de edificación ───
  {
    numero: "9972",
    anio: "2018",
    titulo: "No se ajustó a derecho el permiso de edificación otorgado por DOM de Las Condes sin requerir informe de revisor independiente de obras de construcción",
    materia: "LGUC",
  },

  // ── Probidad — funcionario SEREMI MINVU actuando ante DOM en ejercicio privado
  {
    numero: "E61450",
    anio: "2020",
    titulo: "Funcionario SEREMI Vivienda no puede ejercer privadamente ante la DOM: actividades de patrocinio de solicitudes ante DOM son contrarias a derecho (probidad)",
    materia: "LGUC",
  },

  // ── Fiscalización DOM — obras sin permiso (caso Termas del Flaco) ─────────
  {
    numero: "2797",
    anio: "2009",
    titulo: "Irregularidades en complejo turístico Termas del Flaco: construcciones sin permisos de edificación y deber de fiscalización municipal",
    materia: "LGUC",
  },

  // ── Permisos edificación + SEIA — dictamen histórico (año 2000) ───────────
  {
    numero: "31573",
    anio: "2000",
    titulo: "Las municipalidades pueden otorgar permisos de edificación antes de que la CONAMA/COREMA dicte la RCA — criterio histórico, matizan dictámenes posteriores",
    materia: "LEY-19300",
  },

  // ── OGUC Art. 3.1.3 — fusión de predios con permisos vigentes (DDU 407) ──
  {
    numero: "25690",
    anio: "2019",
    titulo: "Objeta DDU 407 (circular 244/2018) sobre fusión de predios con permisos de edificación vigentes — vigencia retroactiva y Art. 3.1.3 OGUC",
    materia: "OGUC",
  },

  // ── LGUC Art. 116 — caducidad y vigencia de permisos de edificación ───────
  {
    numero: "40981",
    anio: "2015",
    titulo: "Cumplimiento del dictamen 95.979/2014 sobre vigencia del permiso de edificación — facultades de la Administración para declarar caducidad",
    materia: "LGUC",
  },

  // ── DL 2.695 — regularización pequeña propiedad vs Art. 55 LGUC ──────────
  {
    numero: "42084",
    anio: "2017",
    titulo: "No procede aplicar el DL 2.695/1979 en la situación de los inmuebles de que se trata — regularización de pequeña propiedad raíz y Art. 55 LGUC",
    materia: "LGUC",
  },

  // ── Probidad cadena (1999–2015) ───────────────────────────────────────────
  {
    numero: "4771",
    anio: "1999",
    titulo: "Funcionarios de desarrollo urbano e infraestructura de SEREMI MINVU no pueden quedar liberados del principio de probidad — primer dictamen fundacional",
    materia: "LGUC",
  },
  {
    numero: "28417",
    anio: "1999",
    titulo: "Arquitecto SEREMI MINVU no puede ser socio de empresa que ejecuta proyectos de construcción — incompatibilidad con el principio de probidad",
    materia: "LGUC",
  },
  {
    numero: "50952",
    anio: "2015",
    titulo: "Es incompatible con el cargo el ejercicio privado de la profesión en materias que deba analizar, informar o resolver el funcionario o su organismo",
    materia: "LGUC",
  },

  // ── DOM — plazo de pronunciamiento (Art. 1.4.10 OGUC) ────────────────────
  {
    numero: "E111407",
    anio: "2025",
    titulo: "DOM debe pronunciarse en el plazo de 30 días del Art. 1.4.10 OGUC — juridicidad de ordenanza municipal sobre requisitos y plazos para proyectos",
    materia: "OGUC",
  },
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
