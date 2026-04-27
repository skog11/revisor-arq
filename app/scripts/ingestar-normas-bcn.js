/**
 * Descarga normas desde la API JSON de BCN y las ingesta en Supabase vía Voyage AI.
 * Uso: node --env-file=.env.local scripts/ingestar-normas-bcn.js
 *
 * API BCN: https://nuevo.leychile.cl/servicios/Navegar/get_norma_json?idNorma={id}&agrupa_partes=1
 * Devuelve JSON con campo "html" (array anidado) que contiene el texto completo.
 */

const { createClient } = require('@supabase/supabase-js');

const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY;

if (!SB_URL || !SB_KEY || !VOYAGE_KEY) {
  console.error('Faltan variables de entorno. Usar: node --env-file=.env.local scripts/ingestar-normas-bcn.js');
  process.exit(1);
}

const sb = createClient(SB_URL, SB_KEY);

// ── Normas a ingestar ─────────────────────────────────────────
const NORMAS = [
  {
    tipo: 'Ley', numero: '20.422',
    titulo: 'Establece Normas sobre Igualdad de Oportunidades e Inclusión Social de Personas con Discapacidad',
    idNorma: 1010903, organo_emisor: 'CONGRESO', dominio: 'Accesibilidad', jerarquia_norm: 'ley',
  },
  {
    tipo: 'DS', numero: '50/2016 MINVU',
    titulo: 'Modifica OGUC — Accesibilidad Universal y Diseño Universal (Decreto 50, 04-mar-2016)',
    idNorma: 1088117, organo_emisor: 'MINVU', dominio: 'Accesibilidad', jerarquia_norm: 'reglamento',
  },
  {
    tipo: 'Ley', numero: '20.417',
    titulo: 'Crea el Ministerio del Medio Ambiente, el Servicio de Evaluación Ambiental y la Superintendencia del Medio Ambiente',
    idNorma: 1010459, organo_emisor: 'CONGRESO', dominio: 'Medioambiente', jerarquia_norm: 'ley',
    reingestar: true, // tiene 0 chunks en BD
  },
  {
    tipo: 'DS', numero: '7/2025 MINVU',
    titulo: 'Aprueba Reglamento de la Ley N° 21.442 — Nueva Ley de Copropiedad Inmobiliaria',
    idNorma: 1210089, organo_emisor: 'MINVU', dominio: 'Copropiedad', jerarquia_norm: 'reglamento',
  },
];

// ── BCN JSON API ──────────────────────────────────────────────
async function fetchNormaJson(idNorma) {
  const url = `https://nuevo.leychile.cl/servicios/Navegar/get_norma_json?idNorma=${idNorma}&idVersion=&idLey=&tipoVersion=&cve=&agrupa_partes=1&r=`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': `https://nuevo.leychile.cl/navegar?idNorma=${idNorma}`,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`BCN API ${res.status} para idNorma=${idNorma}`);
  return res.json();
}

// ── Extrae texto plano del HTML anidado BCN ───────────────────
function extractText(items) {
  if (!Array.isArray(items)) return '';
  const parts = [];
  for (const item of items) {
    if (item.t) {
      const text = item.t
        .replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
        .replace(/\s+/g, ' ').trim();
      if (text.length > 5) parts.push(text);
    }
    if (item.h) parts.push(extractText(item.h));
  }
  return parts.join('\n\n');
}

// ── Chunking ──────────────────────────────────────────────────
const MAX_TOKENS = 800, OVERLAP_TOKENS = 100, CHARS_PER_TOKEN = 4;
const estimarTokens = s => Math.ceil(s.length / CHARS_PER_TOKEN);
const RE_ARTICULO = /^(?:art[ií]culo|art\.|circular\s+ddu\s+n[°º])\s*[\d.]+/im;

function extraerArticulos(texto) {
  const sep = /\n(?=(?:art[ií]culo\s+\d+[°º]?|art\.\s*[\d.]+)\s*[.–\-\s])/gi;
  if (!RE_ARTICULO.test(texto)) return null;
  const partes = texto.split(sep).map(p => p.trim()).filter(Boolean);
  return partes.length < 2 ? null : partes;
}

function chunkear(texto) {
  const unidades = extraerArticulos(texto) ?? texto.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (!unidades.length) return [];
  const chunks = [];
  let inicio = 0;
  while (inicio < unidades.length) {
    let fin = inicio, tokens = 0;
    while (fin < unidades.length) {
      const t = estimarTokens(unidades[fin]);
      if (tokens + t > MAX_TOKENS && fin > inicio) break;
      tokens += t; fin++;
    }
    if (fin === inicio) fin = inicio + 1;
    chunks.push(unidades.slice(inicio, fin).join('\n\n'));
    let solapTokens = 0, retroceso = fin;
    while (retroceso > inicio + 1) {
      retroceso--;
      solapTokens += estimarTokens(unidades[retroceso]);
      if (solapTokens >= OVERLAP_TOKENS) break;
    }
    inicio = retroceso >= fin ? fin : retroceso;
  }
  return chunks;
}

// ── Voyage AI embeddings ──────────────────────────────────────
// Plan gratuito: 3 RPM, 10K TPM
// Estrategia: 1 chunk por request, 22s entre requests, reintento en 429
const BATCH_SIZE = 1;        // 1 chunk ≈ 1000 tokens → bien bajo el límite 10K TPM
const MIN_GAP_MS  = 22_000;  // ≥22s entre requests → ≤2.7 RPM
const sleep = ms => new Promise(r => setTimeout(r, ms));

let lastRequestAt = 0; // timestamp global para serializar todas las llamadas Voyage

async function voyageRequest(batch) {
  // Respetar gap mínimo entre requests
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequestAt);
  if (wait > 0) {
    process.stdout.write(`    Esperando ${Math.ceil(wait/1000)}s (rate limit)...    \r`);
    await sleep(wait);
  }
  lastRequestAt = Date.now();

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VOYAGE_KEY}` },
    body: JSON.stringify({ input: batch, model: 'voyage-law-2', input_type: 'document' }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429) {
    // Backoff de 65s y reintento único
    console.log(`\n    429 recibido — esperando 65s y reintentando...`);
    await sleep(65_000);
    lastRequestAt = Date.now();
    const r2 = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VOYAGE_KEY}` },
      body: JSON.stringify({ input: batch, model: 'voyage-law-2', input_type: 'document' }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r2.ok) throw new Error(`Voyage API ${r2.status}: ${await r2.text()}`);
    return r2.json();
  }
  if (!res.ok) throw new Error(`Voyage API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function embedBatch(textos) {
  const all = [];
  const total = textos.length;
  for (let i = 0; i < textos.length; i += BATCH_SIZE) {
    const batch = textos.slice(i, i + BATCH_SIZE);
    process.stdout.write(`    Embedding ${i+1}/${total}...    \r`);
    const json = await voyageRequest(batch);
    all.push(...json.data.map(d => d.embedding));
  }
  process.stdout.write('\n');
  return all;
}

// ── Ingest one norma ──────────────────────────────────────────
async function ingestar(norma) {
  const { tipo, numero, titulo, organo_emisor, dominio, jerarquia_norm, idNorma } = norma;
  const url_fuente = `https://www.leychile.cl/Navegar?idNorma=${idNorma}`;

  // 1. Fetch text from BCN API
  console.log(`  Obteniendo texto de BCN (idNorma=${idNorma})...`);
  const json = await fetchNormaJson(idNorma);
  const texto = extractText(json.html || []);
  console.log(`  Texto extraído: ${texto.length} caracteres`);
  if (texto.length < 100) throw new Error('Texto demasiado corto — idNorma inválido o sin texto');

  // 2. Upsert norma
  const { data: normaRows, error: normaErr } = await sb
    .from('normas')
    .upsert({
      tipo, numero, titulo, vigente: true, url_fuente,
      organo_emisor, dominio, jerarquia_norm,
      fecha_actualizacion: new Date().toISOString(),
    }, { onConflict: 'tipo,numero', ignoreDuplicates: false })
    .select('id');
  if (normaErr || !normaRows?.length) throw new Error(normaErr?.message ?? 'Error upsert norma');
  const normaId = normaRows[0].id;
  console.log(`  Norma upserted: id=${normaId}`);

  // 3. Eliminar chunks previos
  await sb.from('chunks').delete().eq('norma_id', normaId);

  // 4. Chunking
  const textos = chunkear(texto);
  if (!textos.length) throw new Error('Texto sin chunks válidos');
  console.log(`  Chunks generados: ${textos.length}`);

  const textosConPrefijo = textos.map((t, i) =>
    `[${tipo} ${numero}${textos.length > 1 ? ` – parte ${i+1}/${textos.length}` : ''}]\n${t}`
  );

  // 5. Embeddings
  const embeddings = await embedBatch(textosConPrefijo);

  // 6. Insertar chunks
  const RE_ART_NUM = /^(?:art[ií]culo|art\.)\s*([\d.]+[°º]?)/i;
  const rows = textos.map((textoOriginal, i) => {
    const m = textoOriginal.trimStart().match(RE_ART_NUM);
    const articuloNum = m ? m[1].replace(/[°º]$/, '') : null;
    return {
      norma_id: normaId,
      texto: textosConPrefijo[i],
      tokens: estimarTokens(textosConPrefijo[i]),
      orden: i,
      metadatos: { tipo_norma: tipo, numero_norma: numero, url_fuente, ...(articuloNum ? { articulo: articuloNum } : {}) },
      fuente: url_fuente,
      embedding: embeddings[i],
    };
  });

  const { error: insertErr } = await sb.from('chunks').insert(rows);
  if (insertErr) throw new Error(insertErr.message);
  console.log(`  ✅ ${rows.length} chunks insertados`);
  return rows.length;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`Iniciando ingesta de ${NORMAS.length} normas...\n`);
  const resultados = [];
  for (const norma of NORMAS) {
    console.log(`\n📄 ${norma.tipo} ${norma.numero}`);
    console.log(`   ${norma.titulo}`);
    try {
      const chunks = await ingestar(norma);
      resultados.push({ norma: `${norma.tipo} ${norma.numero}`, chunks, ok: true });
      console.log(`   → ${chunks} chunks totales`);
    } catch (err) {
      resultados.push({ norma: `${norma.tipo} ${norma.numero}`, error: err.message, ok: false });
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
  console.log('\n─── Resumen ───────────────────────────────────────');
  for (const r of resultados) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.norma}: ${r.ok ? r.chunks + ' chunks' : r.error}`);
  }
  console.log('──────────────────────────────────────────────────\n');
}

main().catch(err => { console.error(err); process.exit(1); });
