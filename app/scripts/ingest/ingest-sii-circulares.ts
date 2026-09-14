/**
 * ingest-sii-circulares.ts — Ingesta de Circulares del SII sobre impuesto
 * territorial y bienes raíces.
 *
 * Por qué existe: el corpus tenía las leyes tributarias (Ley 17.235, DL 824,
 * DL 825, DL 3.475) pero no el criterio de fiscalización del SII, que es donde
 * se resuelve, por ejemplo, cuándo un predio deja de ser agrícola o cómo se
 * aplica la sobretasa del Art. 8 a sitios no edificados. Sin esa capa la app
 * responde con el texto legal y se queda corta frente a la práctica.
 *
 * Es el equivalente tributario de lo que los dictámenes CGR son para urbanismo.
 *
 * Flujo:
 *   1. Recorre los índices anuales del SII y arma un catálogo de circulares.
 *   2. Filtra por materia con FILTRO_MATERIA (impuesto territorial / bienes raíces).
 *   3. Descarga el PDF, extrae texto con pdf-parse.
 *   4. Parte el texto en secciones numeradas (las circulares no tienen artículos).
 *   5. Chunkea con el mismo chunker del resto del corpus.
 *   6. Embeds con Voyage AI (voyage-law-2, igual que todo lo demás).
 *   7. Upsert en `normas` + reemplazo de chunks.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/ingest/ingest-sii-circulares.ts --dry
 *   npx tsx --env-file=.env.local scripts/ingest/ingest-sii-circulares.ts
 *   ... --desde=2013 --hasta=2026 --solo=31-2019
 */

import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import { chunkearNorma } from "./chunker";
import { embedTextos } from "./embedder";
import type { ParsedArticulo, ParsedNorma } from "./types";

// --- Configuración ----------------------------------------------------------

const BASES = [
  "https://www.sii.cl/normativa_legislacion/circulares",
  "https://www.sii.cl/documentos/circulares",
];

/**
 * Materias que interesan. Deliberadamente acotado a suelo y bienes raíces:
 * el SII emite ~60 circulares al año y la enorme mayoría son tablas mensuales
 * de UF, reajustes e impuesto de segunda categoría, que no aportan nada a una
 * consulta normativa sobre un terreno.
 */
const FILTRO_MATERIA =
  /impuesto\s+territorial|bienes?\s+ra[ií]ces|aval[uú]o|reaval[uú]o|contribucion|tasaci[oó]n\s+(fiscal|de\s+bienes)|17\.?235|sitios?\s+no\s+edificad|predio\s+agr[ií]cola|serie\s+(agr[ií]cola|no\s+agr[ií]cola)|exenci[oó]n.{0,40}territorial|catastro\s+de\s+bienes|20\.?732/i;

/** Falsos positivos conocidos: enganchan por una palabra suelta pero no son de suelo. */
const EXCLUIDAS = new Set(["66-2020", "37-2015", "39-2016"]);

const TIPO = "CIRC_SII";

// --- Utilidades -------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const DRY = args.includes("--dry");
const DESDE = Number(flag("desde") ?? 2013);
const HASTA = Number(flag("hasta") ?? new Date().getFullYear());
const SOLO = flag("solo");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bajar(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Los índices viejos del SII son cp1252; los nuevos utf-8 con BOM. */
function decodificar(buf: Buffer): string {
  const utf8 = buf.toString("utf-8");
  if ((utf8.match(/\uFFFD/g) ?? []).length > 5) return buf.toString("latin1");
  return utf8.replace(/^\uFEFF/, "");
}

function limpiar(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&deg;/gi, "°")
    .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú").replace(/&ntilde;/gi, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Catálogo ---------------------------------------------------------------

interface Circular {
  anyo: number;
  numero: string;     // "31"
  clave: string;      // "31-2019"
  titulo: string;
  materia: string;
  pdf: string;
  fecha?: string;     // ISO
}

const RE_NUEVO = /<h5[^>]*>\s*<a href='([^']+)'[^>]*>([^<]+)<\/a>\s*<\/h5>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
const RE_VIEJO = /<a href='([^']*circu[^']*\.pdf)'>\s*(Circular[^<]*)<\/a>([\s\S]*?)<\/p>/gi;

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

function fechaDesdeTitulo(t: string): string | undefined {
  const m = t.match(/del\s+(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+del?\s+(\d{4})/i);
  if (!m) return undefined;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return undefined;
  return `${m[3]}-${mes}-${m[1].padStart(2, "0")}`;
}

async function catalogo(): Promise<Circular[]> {
  const out: Circular[] = [];
  for (let anyo = DESDE; anyo <= HASTA; anyo++) {
    let html: string | null = null;
    let base = "";
    for (const b of BASES) {
      try {
        html = decodificar(await bajar(`${b}/${anyo}/indcir${anyo}.htm`));
        base = b;
        break;
      } catch { /* probar la siguiente base */ }
    }
    if (!html) { console.log(`  ${anyo}: sin índice`); continue; }

    let filas = [...html.matchAll(RE_NUEVO)];
    if (filas.length === 0) filas = [...html.matchAll(RE_VIEJO)];

    let n = 0;
    for (const f of filas) {
      const titulo = limpiar(f[2]);
      const materia = limpiar(f[3]).replace(/Fuente:.*$/i, "").trim();
      const numero = titulo.match(/N[°º]\s*(\d+)/)?.[1];
      if (!numero) continue;
      const href = f[1];
      out.push({
        anyo,
        numero,
        clave: `${numero}-${anyo}`,
        titulo,
        materia,
        pdf: href.startsWith("http") ? href : `${base}/${anyo}/${href.replace(/^\.\//, "")}`,
        fecha: fechaDesdeTitulo(titulo),
      });
      n++;
    }
    console.log(`  ${anyo}: ${n} circulares`);
    await sleep(150);
  }
  return out;
}

// --- Parseo del PDF a secciones --------------------------------------------

/**
 * Las circulares no tienen artículos: se organizan en secciones romanas
 * (I.-, II.-) o numeradas (1.-, 2.-). Se usan como unidad equivalente para
 * reutilizar el chunker del resto del corpus. Si no hay secciones detectables
 * el documento entra como una sola unidad y el chunker lo parte por tamaño.
 */
function seccionar(texto: string): ParsedArticulo[] {
  const limpio = texto.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n");
  const re = /^\s*((?:[IVXLC]{1,5}|\d{1,2}(?:\.\d{1,2})?))\s*[.\-–)]\s*(?=[A-ZÁÉÍÓÚÑ"“])/gm;

  const cortes: { idx: number; num: string }[] = [];
  for (const m of limpio.matchAll(re)) {
    if (m.index === undefined) continue;
    cortes.push({ idx: m.index, num: m[1] });
  }

  if (cortes.length < 2) {
    return [{ numero: "1", texto: limpio.trim(), jerarquia: {}, orden: 0 }];
  }

  const arts: ParsedArticulo[] = [];
  for (let i = 0; i < cortes.length; i++) {
    const ini = cortes[i].idx;
    const fin = i + 1 < cortes.length ? cortes[i + 1].idx : limpio.length;
    const cuerpo = limpio.slice(ini, fin).trim();
    if (cuerpo.length < 80) continue;   // encabezado suelto, no una sección
    arts.push({ numero: cortes[i].num, texto: cuerpo, jerarquia: {}, orden: arts.length });
  }
  return arts.length ? arts : [{ numero: "1", texto: limpio.trim(), jerarquia: {}, orden: 0 }];
}

// --- Ingesta ----------------------------------------------------------------

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

async function main() {
  console.log(`\nCatálogo de circulares SII ${DESDE}-${HASTA}`);
  const todas = await catalogo();

  let sel = todas.filter((c) => FILTRO_MATERIA.test(`${c.materia} ${c.titulo}`));
  sel = sel.filter((c) => !EXCLUIDAS.has(c.clave));
  if (SOLO) sel = sel.filter((c) => c.clave === SOLO);

  console.log(`\n${todas.length} circulares revisadas → ${sel.length} de impuesto territorial / bienes raíces\n`);
  for (const c of sel) console.log(`  [${c.anyo}] N° ${c.numero} — ${c.materia.slice(0, 110)}`);

  if (DRY) {
    console.log("\n--dry: se descargan y parsean, no se escribe en Supabase\n");
  }

  const sb = DRY ? null : cliente();
  let totalChunks = 0;

  for (const c of sel) {
    process.stdout.write(`\n[${c.clave}] descargando… `);
    let texto: string;
    try {
      const buf = await bajar(c.pdf);
      texto = (await pdfParse(buf)).text;
    } catch (e) {
      console.log(`FALLO: ${(e as Error).message.slice(0, 80)}`);
      continue;
    }
    if (texto.trim().length < 500) {
      console.log(`texto insuficiente (${texto.trim().length} chars) — ¿PDF escaneado? se omite`);
      continue;
    }

    const norma: ParsedNorma = {
      tipo: TIPO as ParsedNorma["tipo"],
      numero: c.clave,
      titulo: `Circular SII N° ${c.numero} de ${c.anyo} — ${c.materia.slice(0, 220)}`,
      url_fuente: c.pdf,
      fecha_publicacion: c.fecha,
      articulos: seccionar(texto),
    };

    const chunks = chunkearNorma(norma);
    process.stdout.write(`${norma.articulos.length} secciones → ${chunks.length} chunks `);
    totalChunks += chunks.length;

    if (DRY || !sb) { console.log("(dry)"); continue; }

    // El indice unico de `normas` es sobre una expresion
    // (tipo, numero, COALESCE(anio_norma,-1), COALESCE(organo_emisor,'')), que
    // PostgREST no puede usar como onConflict. Se resuelve con select + update
    // o insert, que ademas deja explicito si la circular ya estaba.
    const datos = {
      tipo: TIPO,
      numero: c.clave,
      titulo: norma.titulo,
      url_fuente: c.pdf,
      fecha_publicacion: c.fecha ?? null,
      fecha_actualizacion: new Date().toISOString().slice(0, 10),
      dominio: "tributario",
      subdominio: "impuesto_territorial",
      organo_emisor: "Servicio de Impuestos Internos",
      jerarquia_norm: "instruccion",
      alcance: "nacional",
      anio_norma: c.anyo,
      vigente: true,
    };

    const { data: existente } = await sb
      .from("normas").select("id").eq("tipo", TIPO).eq("numero", c.clave).maybeSingle();

    let normaId: string;
    if (existente?.id) {
      const { error } = await sb.from("normas").update(datos).eq("id", existente.id);
      if (error) { console.log(`ERROR update normas: ${error.message}`); continue; }
      normaId = existente.id as string;
    } else {
      const { data: creada, error } = await sb
        .from("normas").insert(datos).select("id").single();
      if (error || !creada) { console.log(`ERROR insert normas: ${error?.message}`); continue; }
      normaId = creada.id as string;
    }
    await sb.from("chunks").delete().eq("norma_id", normaId);

    const embeddings = await embedTextos(chunks.map((ch) => ch.texto), c.clave);
    const filas = chunks.map((ch, i) => ({
      norma_id: normaId,
      texto: ch.texto,
      embedding: embeddings[i],
      tokens: ch.tokens,
      orden: ch.orden,
      metadatos: ch.metadatos,
      fecha_vigencia_desde: ch.fecha_vigencia_desde ?? null,
      fecha_vigencia_hasta: null,
      fuente: c.pdf,
    }));

    for (let i = 0; i < filas.length; i += 100) {
      const { error } = await sb.from("chunks").insert(filas.slice(i, i + 100));
      if (error) { console.log(`ERROR chunks: ${error.message}`); break; }
    }
    console.log("✓");
  }

  console.log(`\nListo. ${sel.length} circulares, ${totalChunks} chunks${DRY ? " (dry)" : ""}.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });