/**
 * Convierte fichas XML de LeyChile en fuentes completas para el corpus.
 * La ficha XML es solo metadato: el articulado se obtiene del PDF vigente BCN.
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { CORPUS_ROOT, loadManifiesto, saveManifiesto, type ManifiestoEntry } from "./manifiesto";

const UA = "Mozilla/5.0 (RevisorArq/1.0)";
const DEFAULT_INPUT = resolve(__dirname, "../../../../00_MEJORAS POR IMPLEMENTAR/NORMATIVA FALTANTE");
const OUTPUT_DIR = join(CORPUS_ROOT, "13_Nuevas_Normas_2026");
type Tipo = "LEY" | "DS" | "DFL" | "DL";
type Ficha = { id: number; tipo: Tipo; numero: string; titulo: string; organismo: string; version: string; publicacion: string; archivo: string };

function decodeXml(value: string): string {
  const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
  return value.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&([a-z]+);/gi, (_, n) => named[n.toLowerCase()] ?? `&${n};`)
    .replace(/\s+/g, " ").trim();
}
function tag(xml: string, name: string): string | null {
  const found = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return found ? decodeXml(found[1].replace(/<[^>]+>/g, " ")) : null;
}
function ficha(path: string): Ficha {
  const xml = readFileSync(path, "utf8");
  const id = xml.match(/\bnormaId="(\d+)"/i)?.[1];
  const tipoOrigen = tag(xml, "Tipo")?.toUpperCase();
  const tipo = tipoOrigen === "LEY" ? "LEY"
    : tipoOrigen === "DECRETO" || tipoOrigen === "DECRETO SUPREMO" ? "DS"
    : tipoOrigen === "DECRETO CON FUERZA DE LEY" ? "DFL"
    : tipoOrigen === "DECRETO LEY" ? "DL"
    : tipoOrigen;
  const numero = tag(xml, "Numero"), titulo = tag(xml, "TituloNorma"), organismo = tag(xml, "Organismo");
  const version = xml.match(/\bfechaVersion="(\d{4}-\d{2}-\d{2})"/i)?.[1];
  const identificadorAttrs = xml.match(/<Identificador\b([^>]*)>/i)?.[1] ?? "";
  const publicacion = identificadorAttrs.match(/\bfechaPublicacion="(\d{4}-\d{2}-\d{2})"/i)?.[1];
  if (!id || !numero || !titulo || !organismo || !version || !publicacion || !(["LEY", "DS", "DFL", "DL"] as string[]).includes(tipo ?? "")) throw new Error(`${path}: ficha sin identidad normativa completa`);
  const resultado = { id: Number(id), tipo: tipo as Tipo, numero, titulo, organismo, version, publicacion, archivo: path };
  const nombre = path.split(/[\\/]/).pop()?.match(/^(LEY|DS|DFL|DL)-(\d+)/i);
  if (nombre && (nombre[1].toUpperCase() !== resultado.tipo || nombre[2] !== resultado.numero)) {
    throw new Error(`${path}: el nombre declara ${nombre[1].toUpperCase()} ${nombre[2]}, pero BCN identifica ${resultado.tipo} ${resultado.numero}`);
  }
  return resultado;
}
function textoCompletoDesdeXml(path: string): { texto: string; articulos: number } | null {
  const xml = readFileSync(path, "utf8");
  const bloques = [...xml.matchAll(/<Texto(?:\s[^>]*)?>([\s\S]*?)<\/Texto>/gi)]
    .map((match) => decodeXml(match[1].replace(/<[^>]+>/g, " ")))
    .filter(Boolean);
  const texto = bloques.join("\n\n").trim();
  const articulos = (texto.match(/\bART[ÍI]CULO\b/gi) ?? []).length;
  return bloques.length > 1 && articulos > 0 ? { texto, articulos } : null;
}
async function versionVigente(id: number, fallback: string): Promise<string> {
  try {
    const html = await (await fetch(`https://www.bcn.cl/leychile/navegar?idNorma=${id}`, { headers: { "User-Agent": UA } })).text();
    const found = html.match(new RegExp(`hddResultadoExportar=${id}\\.(\\d{4}-\\d{2}-\\d{2})`))?.[1];
    return found && found >= fallback ? found : fallback;
  } catch { return fallback; }
}
function exportUrl(id: number, version: string, filename: string) {
  const p = new URLSearchParams({ radioExportar: "Normas", exportar_formato: "pdf", nombrearchivo: filename, exportar_con_notas_bcn: "True", exportar_con_notas_originales: "True", exportar_con_notas_al_pie: "True", hddResultadoExportar: `${id}.${version}.0.0#` });
  return `https://nuevo.leychile.cl/servicios/Consulta/Exportar?${p}`;
}
function versionConfiable(version: string, fechaPublicacion: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  // Algunas exportaciones BCN usan 2222-02-02 como centinela técnico; no es
  // una fecha de vigencia y no debe propagarse al manifiesto.
  return version > hoy ? fechaPublicacion : version;
}
async function textoOficial(url: string) {
  let response: Response | undefined;
  for (let intento = 1; intento <= 3; intento++) {
    response = await fetch(url, { headers: { "User-Agent": UA } });
    if (response.ok && (response.headers.get("content-type") ?? "").includes("pdf")) break;
    if (intento === 3) throw new Error(`BCN no entregó un PDF oficial (HTTP ${response.status})`);
    await new Promise((r) => setTimeout(r, intento * 2_000));
  }
  if (!response) throw new Error("respuesta BCN inexistente");
  const pdf = Buffer.from(await response.arrayBuffer());
  if (pdf.length < 10_000) throw new Error("PDF demasiado pequeño");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
  const parsed = await pdfParse(pdf); const texto = parsed.text.replace(/\u0000/g, "").trim();
  if (texto.length < 5_000 || !( /\bART[ÍI]CULO\b/i.test(texto) )) throw new Error(`extracción insuficiente: ${texto.length} caracteres`);
  return { pdf, texto, paginas: parsed.numpages };
}
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 70); }
function options() { const input = process.argv.find((x) => x.startsWith("--dir="))?.slice(6); return { input: input ? resolve(input) : DEFAULT_INPUT, dry: process.argv.includes("--dry"), soloXmlCompleto: process.argv.includes("--solo-xml-completo") }; }

async function main() {
  const { input, dry, soloXmlCompleto } = options();
  if (!existsSync(input)) throw new Error(`no existe el directorio: ${input}`);
  const archivos = readdirSync(input).filter((f) => f.toLowerCase().endsWith(".xml"));
  const fichas: Ficha[] = [], rechazadas: string[] = [];
  for (const archivo of archivos) {
    try { fichas.push(ficha(join(input, archivo))); }
    catch (error) { rechazadas.push(`${archivo}: ${(error as Error).message}`); }
  }
  if (rechazadas.length) {
    console.warn("Fichas rechazadas (no se incorporarán):");
    rechazadas.forEach((motivo) => console.warn(`  - ${motivo}`));
  }
  const seleccionadas = soloXmlCompleto ? fichas.filter((f) => textoCompletoDesdeXml(f.archivo)) : fichas;
  if (!seleccionadas.length) throw new Error("no hay fichas BCN aptas para importar");
  if (new Set(seleccionadas.map((f) => f.id)).size !== seleccionadas.length) throw new Error("hay idNorma duplicados");
  console.log(`Importación BCN: ${seleccionadas.length} fichas${soloXmlCompleto ? " XML completas" : ""}${dry ? " (DRY)" : ""}`);
  if (dry) { seleccionadas.forEach((f) => console.log(`  ✓ ${f.tipo} ${f.numero} · BCN ${f.id}`)); return; }

  const manifiesto = loadManifiesto(); mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const f of seleccionadas) {
    const xmlCompleto = textoCompletoDesdeXml(f.archivo);
    const versionDescargada = xmlCompleto ? f.version : await versionVigente(f.id, f.version);
    const version = versionConfiable(versionDescargada, f.publicacion); const base = `${f.tipo}-${f.numero}-${f.publicacion.slice(0, 4)}-${f.id}`;
    console.log(`↓ ${f.tipo} ${f.numero} · BCN ${f.id} · versión ${version}`);
    const descargada = xmlCompleto ? null : await textoOficial(exportUrl(f.id, version, base));
    const texto = xmlCompleto?.texto ?? descargada!.texto;
    const paginas = descargada?.paginas;
    const pdf = descargada?.pdf;
    const target = join(OUTPUT_DIR, `${base}_${slug(f.titulo)}`), source = join(target, "01_fuente_oficial"), meta = join(target, "03_metadatos"), fuente = `https://www.bcn.cl/leychile/navegar?idNorma=${f.id}`;
    mkdirSync(source, { recursive: true }); mkdirSync(meta, { recursive: true });
    const archivo = join(source, "extraido.txt"); writeFileSync(archivo, texto, "utf8");
    writeFileSync(join(source, "fuente_bcn.xml"), readFileSync(f.archivo));
    if (pdf) writeFileSync(join(source, "fuente_bcn.pdf"), pdf);
    writeFileSync(join(meta, "metadata.json"), JSON.stringify({ titulo_oficial: f.titulo, tipo_norma: f.tipo, numero: f.numero, anio: f.publicacion.slice(0, 4), organismo: f.organismo, url: fuente, id_norma_bcn: f.id, fecha_version_bcn: version, ficha_xml_origen: f.archivo }, null, 2), "utf8");
    const entry: ManifiestoEntry = { tipo: f.tipo, numero: f.numero, titulo: f.titulo, url_fuente: fuente, fecha_descarga: new Date().toISOString(), hash: createHash("sha256").update(texto).digest("hex"), archivo, chars: texto.length, paginas, anio_norma: Number(f.publicacion.slice(0, 4)), organo_emisor: f.organismo, id_norma_bcn: f.id, fecha_publicacion: f.publicacion };
    manifiesto[base] = entry; console.log(`  ✓ ${paginas ? `${paginas} págs · ` : "XML completo · "}${texto.length.toLocaleString("es-CL")} caracteres`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  saveManifiesto(manifiesto);
}
main().catch((error) => { console.error(`✗ ${(error as Error).message}`); process.exit(1); });
