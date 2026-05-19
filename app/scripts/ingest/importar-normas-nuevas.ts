/**
 * importar-normas-nuevas.ts
 * Copia archivos desde NORMAS/ al corpus y actualiza manifiesto.json
 * Uso: tsx scripts/ingest/importar-normas-nuevas.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const ROOT = join(__dirname, "../../..");
const NORMAS_DIR = join(ROOT, "NORMAS");
const CORPUS_ROOT = join(ROOT, "corpus");
const MANIFIESTO_PATH = join(CORPUS_ROOT, "manifiesto.json");
const DEST_DIR = join(CORPUS_ROOT, "13_Nuevas_Normas_2026");

type ManifiestoEntry = {
  tipo: string;
  numero: string;
  titulo: string;
  url_fuente: string;
  fecha_descarga: string;
  fecha_publicacion: string;
  hash: string;
  archivo: string;
  chars: number;
};
type Manifiesto = Record<string, ManifiestoEntry>;

const manifiesto: Manifiesto = JSON.parse(readFileSync(MANIFIESTO_PATH, "utf-8"));

// ─── Normas NUEVAS (copiar + agregar entrada) ─────────────────────────────────
const NUEVAS: Array<[string, string, string, string, string, string, string]> = [
  ["LEY-20936",   "Ley_20936_Transmision_Electrica.txt",        "LEY", "20936", "Establece un Nuevo Sistema de Transmisión Eléctrica y crea Organismo Coordinador", "https://www.bcn.cl/leychile/navegar?idNorma=1091349", "2016-07-20"],
  ["DS-10-MINVU", "DS-10_MINVU_Viviendas_Economicas_DFL2.txt",  "DS",  "10",    "Reglamento del Sistema Integrado de Subsidio Habitacional (Viviendas Económicas DFL-2)", "https://www.bcn.cl/leychile/navegar?idNorma=1077508", "2015-08-19"],
  ["DS-8-SEC",    "DS-8_Instalaciones_Electricas_SEC.txt",       "DS",  "8",     "Reglamento de Seguridad de las Instalaciones de Consumo de Energía Eléctrica (SEC)", "https://www.bcn.cl/leychile/navegar?idNorma=1138489", "2020-03-05"],
  ["DS-66-GAS",   "DS-66_Reglamento_Gas.txt",                   "DS",  "66",    "Reglamento de Instalaciones Interiores y Medidores de Gas", "https://www.bcn.cl/leychile/navegar?idNorma=257983",  "2007-12-20"],
  ["DS-977",      "DS-977_Reglamento_Sanitario_Alimentos.txt",  "DS",  "977",   "Reglamento Sanitario de los Alimentos", "https://www.bcn.cl/leychile/navegar?idNorma=167354",  "1997-03-13"],
  ["NCH-1079",    "NCh1079_Zonificacion_Climatica.txt",         "DS",  "1079",  "NCh 1079 Of.77 - Zonificación climático-habitacional para Chile", "https://www.bcn.cl/leychile/navegar?idNorma=1027009", "2021-01-01"],
  ["LEY-19537",   "Ley_19537_Copropiedad_Inmobiliaria.txt",     "LEY", "19537", "Sobre Copropiedad Inmobiliaria (derogada por Ley 21.442)", "https://www.bcn.cl/leychile/navegar?idNorma=109650",  "1997-12-16"],
  ["DL-3516",     "DL-3516_Subdivision_Predios_Rusticos.txt",   "DL",  "3516",  "Establece normas sobre división de predios rústicos", "https://www.bcn.cl/leychile/navegar?idNorma=6991",    "1980-12-01"],
  ["LEY-18168",   "Ley_18168_Telecomunicaciones.txt",           "LEY", "18168", "Ley General de Telecomunicaciones", "https://www.bcn.cl/leychile/navegar?idNorma=29591",   "1982-10-02"],
  ["LEY-20780",   "Ley_20780_Reforma_Tributaria.txt",           "LEY", "20780", "Reforma Tributaria que modifica el sistema de tributación de la renta e introduce otros ajustes", "https://www.bcn.cl/leychile/navegar?idNorma=1067194", "2014-09-29"],
  ["LEY-21210",   "Ley_21210_Reforma_Tributaria.txt",           "LEY", "21210", "Moderniza la Legislación Tributaria", "https://www.bcn.cl/leychile/navegar?idNorma=1142667", "2020-02-24"],
  ["LEY-19175",   "Ley_19175_Gobierno_Regional.txt",            "LEY", "19175", "Ley Orgánica Constitucional sobre Gobierno y Administración Regional", "https://www.bcn.cl/leychile/navegar?idNorma=30568",   "1992-11-11"],
  ["LEY-18695",   "Ley_18695_Municipalidades.txt",              "LEY", "18695", "Ley Orgánica Constitucional de Municipalidades", "https://www.bcn.cl/leychile/navegar?idNorma=251693",  "1988-12-31"],
];

// ─── Normas a ACTUALIZAR (clave ya existe, nuevo archivo más completo) ────────
const ACTUALIZAR: Array<[string, string, string, string, string, string, string]> = [
  ["DS-60",  "DS-60_Hormigon_Armado.txt",       "DS",  "60",  "Reglamento de Diseño y Cálculo para el Hormigón Armado (ACI 318S-08 adaptado)", "https://www.bcn.cl/leychile/navegar?idNorma=1031405", "2011-12-13"],
  ["DS-61",  "DS-61_Diseno_Sismico_NCh433.txt", "DS",  "61",  "Reglamento de Diseño Sísmico de Edificios (NCh433 Of.2009)", "https://www.bcn.cl/leychile/navegar?idNorma=1031406", "2011-12-13"],
  ["DS-594", "DS-594_Sanitario_Ambiental.txt",  "DS",  "594", "Reglamento sobre Condiciones Sanitarias y Ambientales Básicas en los Lugares de Trabajo", "https://www.bcn.cl/leychile/navegar?idNorma=167766", "1999-01-15"],
];

let agregadas = 0;
let actualizadas = 0;
const skipped: string[] = [];

if (!existsSync(DEST_DIR)) mkdirSync(DEST_DIR, { recursive: true });

// ── Procesar nuevas ────────────────────────────────────────────────────────────
for (const [clave, archivo, tipo, numero, titulo, url, fecha] of NUEVAS) {
  const src = join(NORMAS_DIR, archivo);
  if (!existsSync(src)) {
    skipped.push(`${clave} (no encontrado: ${archivo})`);
    continue;
  }
  if (manifiesto[clave]) {
    skipped.push(`${clave} (ya existe en manifiesto)`);
    continue;
  }

  const dest = join(DEST_DIR, archivo);
  copyFileSync(src, dest);

  const content = readFileSync(dest, "utf-8");
  const hash = createHash("sha256").update(content).digest("hex");

  manifiesto[clave] = { tipo, numero, titulo, url_fuente: url, fecha_descarga: new Date().toISOString(), fecha_publicacion: fecha, hash, archivo: dest, chars: content.length };
  console.log(`+ ${clave}  (${(content.length / 1000).toFixed(0)}k chars)`);
  agregadas++;
}

// ── Procesar actualizaciones ──────────────────────────────────────────────────
for (const [clave, archivo, tipo, numero, titulo, url, fecha] of ACTUALIZAR) {
  const src = join(NORMAS_DIR, archivo);
  if (!existsSync(src)) {
    skipped.push(`${clave} (update, no encontrado)`);
    continue;
  }

  const content = readFileSync(src, "utf-8");
  const hash = createHash("sha256").update(content).digest("hex");

  if (manifiesto[clave]?.hash === hash) {
    skipped.push(`${clave} (hash igual)`);
    continue;
  }

  // Copiar al destino correcto (mantener ruta existente si ya tenía)
  const existingPath = manifiesto[clave]?.archivo;
  let dest: string;
  if (existingPath && existsSync(existingPath)) {
    copyFileSync(src, existingPath);
    dest = existingPath;
  } else {
    dest = join(DEST_DIR, archivo);
    copyFileSync(src, dest);
  }

  manifiesto[clave] = { ...manifiesto[clave], tipo, numero, titulo, url_fuente: url, fecha_publicacion: fecha, hash, archivo: dest, chars: content.length };
  console.log(`~ ${clave}  (actualizado, ${(content.length / 1000).toFixed(0)}k chars)`);
  actualizadas++;
}

writeFileSync(MANIFIESTO_PATH, JSON.stringify(manifiesto, null, 2), "utf-8");

console.log("");
console.log(`✅ Agregadas:    ${agregadas}`);
console.log(`🔄 Actualizadas: ${actualizadas}`);
if (skipped.length) console.log(`⏭  Omitidas:    ${skipped.join(" | ")}`);
console.log(`📦 Total en manifiesto: ${Object.keys(manifiesto).length} normas`);
