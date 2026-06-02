/**
 * Script de Harvesting para la Contraloría General de la República (CGR).
 * 
 * Este script lee el CSV maestro (`cgr-harvesting-master.csv`), busca aquellos dictámenes
 * que no tengan texto o fecha, consulta la API de la CGR, descarga el texto completo,
 * actualiza el CSV y el manifiesto.json, y genera los archivos `.txt`.
 * 
 * Uso: npm run corpus:harvest
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { loadManifiesto, saveManifiesto, CORPUS_ROOT } from "./manifiesto";

const CGR_DIR = join(CORPUS_ROOT, "CGR");
const CSV_PATH = join(CORPUS_ROOT, "cgr-harvesting-master.csv");
const CGR_API_URL = "https://www.contraloria.cl/apibusca/search/dictamenes";

// ─── Tipos e Interfaces ────────────────────────────────────────────────────────

interface CGRRow {
  numero_dictamen: string;
  anio: string;
  fecha: string;
  tipo_dictamen: string;
  organo_origen: string;
  materia_principal: string;
  materia_secundaria: string;
  cluster_tematico: string;
  etapa_afectada: string;
  normas_principales: string;
  normas_secundarias: string;
  organos_involucrados: string;
  tipo_incidencia: string;
  efecto_practico: string;
  riesgo_si_se_omite: string;
  relevancia: string;
  estado_interpretativo: string;
  fuente_oficial_url: string;
  fuentes_secundarias: string;
  cadena_relacionados: string;
  observaciones: string;
  fecha_ultima_verificacion: string;
  origen_harvesting: string;
}

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

// ─── Helpers CSV ───────────────────────────────────────────────────────────────

function leerCSV(): CGRRow[] {
  if (!existsSync(CSV_PATH)) {
    throw new Error(`No se encontró el CSV maestro en ${CSV_PATH}`);
  }
  
  const content = readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").filter(l => l.trim() !== "");
  const headers = lines[0].split(",");
  
  const rows: CGRRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : "";
    });
    rows.push(row as CGRRow);
  }
  return rows;
}

function escribirCSV(rows: CGRRow[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  
  for (const row of rows) {
    const values = headers.map(h => (row as any)[h] || "");
    lines.push(values.join(","));
  }
  
  writeFileSync(CSV_PATH, lines.join("\n"), "utf-8");
}

function buildKey(numero: string, anio: string): string {
  return `CGR-${numero}-${anio}`;
}

function buildArchivePath(numero: string, anio: string): string {
  return join(CGR_DIR, `${numero}_${anio}.txt`);
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

async function buscarEnAPICGR(numero: string, anio: string): Promise<CGRAPIHit | null> {
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

    if (!res.ok) return null;

    const data = (await res.json()) as CGRAPIResponse;
    const hits = data?.hits?.hits ?? [];
    if (hits.length === 0) return null;

    const yearSuffix = `N${anio.slice(-2)}`.toUpperCase();
    const normalNum = numero.replace(/^0+/, "").toUpperCase();

    const exact = hits.find((h) => {
      const id = h._id.toUpperCase();
      return id.endsWith(yearSuffix) && id.replace(/N\d+$/, "").replace(/^0+/, "") === normalNum;
    });

    if (exact) return exact;

    const byYear = hits.find((h) => (h._source.fecha_documento ?? "").startsWith(anio));
    return byYear || null;
  } catch (err) {
    console.warn(`  [warn] Error en API CGR: ${(err as Error).message}`);
    return null;
  }
}

function extraerTextoDeHit(hit: CGRAPIHit, numero: string, anio: string): string | null {
  const src = hit._source;
  for (const campo of [src.documento_completo, src.materia_raw, src.destinatarios]) {
    if (!campo) continue;
    const texto = limpiarHTML(campo);
    if (texto.length >= 200) {
      if (!texto.includes(`${numero}`) && !texto.toLowerCase().includes("dictamen")) {
        return `DICTAMEN N° ${numero} - ${anio}\n\n${texto}`;
      }
      return texto;
    }
  }
  return null;
}

// ─── Main Harvesting ──────────────────────────────────────────────────────────

async function harvestRow(row: CGRRow): Promise<boolean> {
  if (!row.numero_dictamen || !row.anio) return false;
  
  const key = buildKey(row.numero_dictamen, row.anio);
  const archivePath = buildArchivePath(row.numero_dictamen, row.anio);
  
  const hit = await buscarEnAPICGR(row.numero_dictamen, row.anio);
  if (!hit) {
    console.error(`  [fail] ${key} — no encontrado en API CGR`);
    return false;
  }

  const texto = extraerTextoDeHit(hit, row.numero_dictamen, row.anio);
  if (!texto || texto.length < 200) {
    console.error(`  [fail] ${key} — texto insuficiente`);
    return false;
  }

  // Enriquecer datos
  row.fecha = hit._source.fecha_documento ? hit._source.fecha_documento.split("T")[0] : "";
  row.fuente_oficial_url = hit._source.old_url ?? `https://www.contraloria.cl/web/cgr/busqueda-de-dictamenes?numero=${row.numero_dictamen}&anio=${row.anio}`;
  row.fecha_ultima_verificacion = new Date().toISOString().split("T")[0];
  row.materia_principal = row.materia_principal || hit._source.materia_raw?.slice(0, 100) || "";
  
  writeFileSync(archivePath, texto, "utf-8");
  console.log(`  [ok]   ${key} — ${texto.length} chars`);

  const hash = createHash("sha256").update(texto).digest("hex");
  const manifiesto = loadManifiesto();
  manifiesto[key] = {
    tipo: "CGR",
    numero: `${row.numero_dictamen}-${row.anio}`,
    titulo: row.materia_principal || `Dictamen ${row.numero_dictamen}-${row.anio}`,
    url_fuente: row.fuente_oficial_url,
    fecha_descarga: row.fecha_ultima_verificacion,
    hash,
    archivo: archivePath,
    chars: texto.length,
  };
  saveManifiesto(manifiesto);

  return true;
}

async function main() {
  mkdirSync(CGR_DIR, { recursive: true });
  console.log(`\n── Iniciando Harvesting CGR desde CSV ──────────────────────\n`);

  const rows = leerCSV();
  let procesados = 0;
  let exito = 0;

  for (const row of rows) {
    // Si no tiene fecha, asumimos que no ha sido harvesteado (o si se fuerza).
    if (!row.fecha) {
      console.log(`  [desc] CGR-${row.numero_dictamen}-${row.anio}...`);
      const ok = await harvestRow(row);
      if (ok) exito++;
      procesados++;
      // delay para no saturar
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (procesados > 0) {
    escribirCSV(rows);
    console.log(`\n── CSV actualizado. ${exito}/${procesados} dictámenes procesados.`);
  } else {
    console.log(`\n── Ningún dictamen nuevo para procesar en el CSV.`);
  }
}

main().catch(console.error);
