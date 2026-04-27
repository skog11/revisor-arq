/**
 * Genera un PDF de respaldo con el inventario completo del corpus normativo.
 * Uso: node --env-file=.env.local scripts/generar-pdf-corpus.js
 * Requiere: Playwright instalado (npx playwright install chromium)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('Faltan variables de entorno.');
  process.exit(1);
}

const sb = createClient(SB_URL, SB_KEY);

async function fetchCorpus() {
  const { data, error } = await sb
    .from('normas')
    .select('tipo, numero, titulo, vigente, dominio, organo_emisor, jerarquia_norm, url_fuente')
    .order('tipo').order('numero');
  if (error) throw error;

  // Contar chunks por norma
  const { data: chunkCounts, error: ce } = await sb.rpc('count_chunks_per_norma');
  if (!ce && chunkCounts) {
    const countMap = {};
    for (const row of chunkCounts) countMap[row.norma_id] = row.count;
    // Necesitamos los IDs también
    const { data: normasConId } = await sb.from('normas').select('id, tipo, numero');
    for (const n of (normasConId || [])) {
      const match = data.find(d => d.tipo === n.tipo && d.numero === n.numero);
      if (match) match.chunks = countMap[n.id] || 0;
    }
  } else {
    for (const d of data) d.chunks = '—';
  }
  return data;
}

function buildHtml(normas, fechaGeneracion) {
  const TIPOS_ORDEN = ['LGUC','OGUC','DDU','DDU_ESPECIFICA','Ley','DFL','DL','DS'];
  const groups = {};
  for (const n of normas) {
    if (!groups[n.tipo]) groups[n.tipo] = [];
    groups[n.tipo].push(n);
  }

  const totalChunks = normas.reduce((s, n) => s + (parseInt(n.chunks) || 0), 0);
  const conChunks = normas.filter(n => (parseInt(n.chunks) || 0) > 0).length;

  const tipoLabel = {
    LGUC: 'LGUC — Ley General de Urbanismo y Construcciones',
    OGUC: 'OGUC — Ordenanza General de Urbanismo y Construcciones',
    DDU: 'DDU — Circulares División Desarrollo Urbano MINVU',
    DDU_ESPECIFICA: 'DDU Específica',
    Ley: 'Leyes',
    DFL: 'Decretos con Fuerza de Ley (DFL)',
    DL: 'Decretos Ley (DL)',
    DS: 'Decretos Supremos (DS)',
  };

  let tablas = '';
  for (const tipo of TIPOS_ORDEN) {
    if (!groups[tipo]) continue;
    const rows = groups[tipo].map(n => {
      const chunks = parseInt(n.chunks) || 0;
      const estadoClass = chunks > 0 ? 'ok' : 'error';
      const estadoTxt = chunks > 0 ? `${chunks}` : '⚠ 0';
      return `
        <tr>
          <td class="mono">${escHtml(n.numero)}</td>
          <td>${escHtml(n.titulo)}</td>
          <td>${escHtml(n.dominio || '—')}</td>
          <td>${escHtml(n.organo_emisor || '—')}</td>
          <td class="center ${estadoClass}">${estadoTxt}</td>
          <td class="center">${n.vigente ? '✓' : '✗'}</td>
        </tr>`;
    }).join('');

    tablas += `
      <h2>${escHtml(tipoLabel[tipo] || tipo)}</h2>
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Título</th>
            <th>Dominio</th>
            <th>Órgano Emisor</th>
            <th class="center">Chunks</th>
            <th class="center">Vigente</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Corpus Normativo — Revisor ARQ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; font-size: 10pt; color: #161310; background: white; padding: 20mm 18mm; }
  .cover { text-align: center; padding: 40mm 0 30mm; page-break-after: always; }
  .cover h1 { font-size: 28pt; color: #c64a2c; margin-bottom: 8mm; letter-spacing: -0.5px; }
  .cover .subtitle { font-size: 14pt; color: #5e554c; margin-bottom: 20mm; }
  .cover .meta { font-size: 10pt; color: #8e8478; line-height: 1.8; }
  .cover .badge { display: inline-block; background: #f6f1e7; border: 1px solid #c64a2c; color: #c64a2c; padding: 3px 12px; border-radius: 4px; font-size: 9pt; margin: 3px; }
  .stats { background: #f6f1e7; border-left: 4px solid #c64a2c; padding: 8mm 10mm; margin: 8mm 0; border-radius: 0 6px 6px 0; }
  .stats h3 { font-size: 11pt; color: #c64a2c; margin-bottom: 4mm; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
  .stat { text-align: center; }
  .stat .num { font-size: 22pt; font-weight: bold; color: #161310; }
  .stat .lbl { font-size: 8pt; color: #5e554c; text-transform: uppercase; letter-spacing: 0.5px; }
  h2 { font-size: 12pt; color: #c64a2c; margin: 10mm 0 3mm; border-bottom: 1px solid #e6dcc7; padding-bottom: 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 6mm; }
  th { background: #161310; color: #f6f1e7; padding: 4px 6px; text-align: left; font-size: 8pt; font-weight: normal; letter-spacing: 0.3px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e6dcc7; vertical-align: top; }
  tr:nth-child(even) td { background: #fdfbf6; }
  .mono { font-family: monospace; font-size: 8pt; }
  .center { text-align: center; }
  .ok { color: #2e6553; font-weight: bold; }
  .error { color: #c64a2c; font-weight: bold; }
  .footer { margin-top: 15mm; text-align: center; font-size: 8pt; color: #b8ad9d; border-top: 1px solid #e6dcc7; padding-top: 5mm; }
  @media print {
    body { padding: 0; }
    .cover { padding: 30mm 20mm; }
    h2 { page-break-before: auto; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="cover">
  <div style="font-size:9pt;color:#8e8478;margin-bottom:8mm;letter-spacing:2px;text-transform:uppercase">Documento de Respaldo</div>
  <h1>Corpus Normativo</h1>
  <div class="subtitle">Revisor ARQ — Plataforma de Consulta Normativa con IA</div>
  <div class="meta">
    <div>Fecha de generación: <strong>${fechaGeneracion}</strong></div>
    <div style="margin-top:4mm">
      <span class="badge">Supabase pgvector</span>
      <span class="badge">Voyage AI voyage-law-2</span>
      <span class="badge">Gemini 2.5 Flash</span>
    </div>
  </div>
</div>

<div class="stats">
  <h3>Resumen del Corpus</h3>
  <div class="stats-grid">
    <div class="stat"><div class="num">${normas.length}</div><div class="lbl">Normas registradas</div></div>
    <div class="stat"><div class="num">${conChunks}</div><div class="lbl">Normas con texto</div></div>
    <div class="stat"><div class="num">${totalChunks.toLocaleString('es-CL')}</div><div class="lbl">Chunks indexados</div></div>
    <div class="stat"><div class="num">${normas.filter(n => n.vigente).length}</div><div class="lbl">Normas vigentes</div></div>
  </div>
</div>

${tablas}

<div class="footer">
  Revisor ARQ © 2026 · Generado el ${fechaGeneracion} · Corpus alojado en Supabase (tmypbopdgodbolsjbush)
</div>

</body>
</html>`;
}

function escHtml(str) {
  if (!str) return '—';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function main() {
  console.log('Obteniendo corpus de Supabase...');
  const normas = await fetchCorpus();
  console.log(`${normas.length} normas obtenidas.`);

  const fechaGeneracion = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const html = buildHtml(normas, fechaGeneracion);

  // Guardar HTML intermedio
  const htmlPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'corpus-revisor-arq.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`HTML guardado en: ${htmlPath}`);

  // Generar PDF con Playwright
  console.log('Generando PDF con Playwright...');
  let pw;
  try {
    pw = require('playwright');
  } catch {
    console.log('\n⚠️  Playwright no está instalado.');
    console.log('Para generar el PDF, ejecuta:');
    console.log('  npx playwright install chromium');
    console.log('  node --env-file=.env.local scripts/generar-pdf-corpus.js');
    console.log(`\nAlternativamente, abre el HTML en Chrome y usa Ctrl+P → Guardar como PDF:`);
    console.log(`  ${htmlPath}`);
    return;
  }

  const { chromium } = pw;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`);
  await page.waitForLoadState('networkidle');

  const pdfPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'corpus-revisor-arq.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    printBackground: true,
  });

  await browser.close();
  console.log(`\n✅ PDF generado: ${pdfPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
