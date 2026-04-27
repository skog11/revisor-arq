/**
 * Re-ingesta de normas que fallaron por rate limit de Voyage AI.
 * Uso: node --env-file=.env.local scripts/reingestar-pendientes.js
 */

const { createClient } = require('@supabase/supabase-js');

const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY;

if (!SB_URL || !SB_KEY || !VOYAGE_KEY) { process.exit(1); }

const sb = createClient(SB_URL, SB_KEY);

const NORMAS = [
  {
    tipo: 'DS', numero: '50/2016 MINVU',
    titulo: 'Modifica OGUC — Accesibilidad Universal y Diseño Universal (Decreto 50, 04-mar-2016)',
    idNorma: 1088117, organo_emisor: 'MINVU', dominio: 'Accesibilidad', jerarquia_norm: 'reglamento',
  },
  {
    tipo: 'Ley', numero: '20.417',
    titulo: 'Crea el Ministerio del Medio Ambiente, el Servicio de Evaluación Ambiental y la Superintendencia del Medio Ambiente',
    idNorma: 1010459, organo_emisor: 'CONGRESO', dominio: 'Medioambiente', jerarquia_norm: 'ley',
  },
];

// ─────────────────────────────────────────────────────────────
const MAX_TOKENS = 800, OVERLAP_TOKENS = 100, CHARS_PER_TOKEN = 4;
const estimarTokens = s => Math.ceil(s.length / CHARS_PER_TOKEN);
const RE_ARTICULO = /^(?:art[ií]culo|art\.|circular\s+ddu\s+n[°º])\s*[\d.]+/im;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIN_GAP_MS = 22_000;
let lastRequestAt = 0;

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

function extractText(items) {
  if (!Array.isArray(items)) return '';
  const parts = [];
  for (const item of items) {
    if (item.t) {
      const text = item.t.replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&nbsp;/g,' ')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_,h)=>String.fromCharCode(parseInt(h,16)))
        .replace(/&#([0-9]+);/g, (_,d)=>String.fromCharCode(parseInt(d,10)))
        .replace(/\s+/g,' ').trim();
      if (text.length > 5) parts.push(text);
    }
    if (item.h) parts.push(extractText(item.h));
  }
  return parts.join('\n\n');
}

async function voyageRequest(batch, attempt=0) {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastRequestAt);
  if (wait > 0) {
    process.stdout.write(`  Esperando ${Math.ceil(wait/1000)}s...    \r`);
    await sleep(wait);
  }
  lastRequestAt = Date.now();
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VOYAGE_KEY}` },
    body: JSON.stringify({ input: batch, model: 'voyage-law-2', input_type: 'document' }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 429 && attempt < 3) {
    const delay = 70_000 * (attempt + 1);
    console.log(`\n  429 → backoff ${delay/1000}s (intento ${attempt+1}/3)...`);
    await sleep(delay);
    return voyageRequest(batch, attempt + 1);
  }
  if (!res.ok) throw new Error(`Voyage API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function ingestar(norma) {
  const { tipo, numero, titulo, organo_emisor, dominio, jerarquia_norm, idNorma } = norma;
  const url_fuente = `https://www.leychile.cl/Navegar?idNorma=${idNorma}`;

  console.log(`  Descargando texto (idNorma=${idNorma})...`);
  const res = await fetch(
    `https://nuevo.leychile.cl/servicios/Navegar/get_norma_json?idNorma=${idNorma}&agrupa_partes=1&r=`,
    { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) }
  );
  if (!res.ok) throw new Error(`BCN ${res.status}`);
  const json = await res.json();
  const texto = extractText(json.html || []);
  console.log(`  Texto: ${texto.length} chars`);

  const { data: normaRows, error: normaErr } = await sb
    .from('normas')
    .upsert({ tipo, numero, titulo, vigente: true, url_fuente, organo_emisor, dominio, jerarquia_norm, fecha_actualizacion: new Date().toISOString() },
             { onConflict: 'tipo,numero', ignoreDuplicates: false })
    .select('id');
  if (normaErr || !normaRows?.length) throw new Error(normaErr?.message ?? 'Error upsert');
  const normaId = normaRows[0].id;

  await sb.from('chunks').delete().eq('norma_id', normaId);

  const textos = chunkear(texto);
  console.log(`  Chunks: ${textos.length}`);
  const textosConPrefijo = textos.map((t,i) => `[${tipo} ${numero} – parte ${i+1}/${textos.length}]\n${t}`);

  const embeddings = [];
  for (let i = 0; i < textosConPrefijo.length; i++) {
    process.stdout.write(`  Embedding ${i+1}/${textosConPrefijo.length}...    \r`);
    const json2 = await voyageRequest([textosConPrefijo[i]]);
    embeddings.push(json2.data[0].embedding);
  }
  process.stdout.write('\n');

  const RE_ART_NUM = /^(?:art[ií]culo|art\.)\s*([\d.]+[°º]?)/i;
  const rows = textos.map((textoOriginal, i) => {
    const m = textoOriginal.trimStart().match(RE_ART_NUM);
    const articuloNum = m ? m[1].replace(/[°º]$/, '') : null;
    return {
      norma_id: normaId, texto: textosConPrefijo[i],
      tokens: estimarTokens(textosConPrefijo[i]), orden: i,
      metadatos: { tipo_norma: tipo, numero_norma: numero, url_fuente, ...(articuloNum ? { articulo: articuloNum } : {}) },
      fuente: url_fuente, embedding: embeddings[i],
    };
  });

  const { error: insertErr } = await sb.from('chunks').insert(rows);
  if (insertErr) throw new Error(insertErr.message);
  console.log(`  ✅ ${rows.length} chunks insertados`);
  return rows.length;
}

async function main() {
  // Esperar 70s al inicio para limpiar rate limit de la sesión anterior
  console.log('Esperando 70s para limpiar rate limit de Voyage AI...');
  await sleep(70_000);

  for (const norma of NORMAS) {
    console.log(`\n📄 ${norma.tipo} ${norma.numero}`);
    try {
      const chunks = await ingestar(norma);
      console.log(`   → ${chunks} chunks`);
    } catch (err) {
      console.error(`   ❌ ${err.message}`);
    }
    // Pausa de 70s entre normas para no acumular requests
    if (norma !== NORMAS[NORMAS.length - 1]) {
      console.log('  Pausa 70s entre normas...');
      await sleep(70_000);
    }
  }
  console.log('\nListo.');
}

main().catch(err => { console.error(err); process.exit(1); });
