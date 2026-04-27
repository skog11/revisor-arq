const XLSX = require('xlsx');
const fs = require('fs');

const raw = JSON.parse(fs.readFileSync(process.env.USERPROFILE+'/Downloads/normas_raw.json','utf8'));

// ─── SHEET 1: Normas cargadas ───────────────────────────────
const CATEGORY = n => {
  if (['LGUC','OGUC','DDU','DDU_ESPECIFICA'].includes(n.tipo)) return 'Urbanismo y Construcción';
  if (n.tipo === 'Ley' || n.tipo === 'DFL') return 'Legislación';
  if (n.tipo === 'DS') return 'Reglamentación';
  if (n.tipo === 'DL') return 'Decreto Ley';
  return 'Otro';
};

const cargadas = raw.map(n => ({
  'Tipo': n.tipo,
  'Número': n.numero,
  'Título': n.titulo,
  'Categoría': CATEGORY(n),
  'Chunks': n.chunks,
  'Vigente': n.vigente ? 'Sí' : 'No',
  'Estado': n.chunks > 0 ? 'Cargada' : 'Sin chunks'
}));

// ─── SHEET 2: Pendientes ──────────────────────────────────────
const pendientes = [
  // Accesibilidad
  { Tipo:'Ley', Numero:'20.422', Titulo:'Igualdad de Oportunidades e Inclusión Social de Personas con Discapacidad', Categoria:'Accesibilidad', Prioridad:'Alta', Motivo:'Base legal accesibilidad universal en edificios — obligatorio en permisos de edificación' },
  { Tipo:'DS', Numero:'50/2015 MINVU', Titulo:'Reglamento Accesibilidad — modifica OGUC arts. 4.1.7 y ss.', Categoria:'Accesibilidad', Prioridad:'Alta', Motivo:'Reglamento de la Ley 20.422 aplicado a urbanismo y construcción' },
  // Normas Chilenas NCh
  { Tipo:'NCh', Numero:'433 Of.96 Mod.2009', Titulo:'Diseño Sísmico de Edificios', Categoria:'Norma Técnica', Prioridad:'Alta', Motivo:'Norma obligatoria en todo proyecto estructural — referenciada en OGUC' },
  { Tipo:'NCh', Numero:'430 Of.2008', Titulo:'Hormigón Armado — Requisitos de Diseño y Cálculo', Categoria:'Norma Técnica', Prioridad:'Alta', Motivo:'Requerida para cálculo estructural — referenciada por OGUC art. 5.5' },
  { Tipo:'NCh', Numero:'853 Of.2007', Titulo:'Acondicionamiento Térmico — Envolvente Térmica de Edificios', Categoria:'Norma Técnica', Prioridad:'Media', Motivo:'Norma térmica base — requerida en permisos de edificación desde 2007' },
  { Tipo:'NCh', Numero:'1079 Of.2008', Titulo:'Zonificación Climático-Habitacional de Chile', Categoria:'Norma Técnica', Prioridad:'Media', Motivo:'Base para diseño térmico y eficiencia energética por zona' },
  { Tipo:'NCh', Numero:'2369 Of.2003', Titulo:'Diseño Sísmico de Estructuras Industriales', Categoria:'Norma Técnica', Prioridad:'Baja-Media', Motivo:'Aplica en galpones y uso industrial' },
  // Reglamentos faltantes de leyes ya cargadas
  { Tipo:'DS', Numero:'46/2022 MINVU', Titulo:'Reglamento Ley 21.442 de Copropiedad Inmobiliaria', Categoria:'Copropiedad', Prioridad:'Media', Motivo:'Ley 21.442 está cargada pero falta su reglamento vigente' },
  { Tipo:'DS', Numero:'19/2023 MOP', Titulo:'Reglamento Ley 19.525 — Evacuación y Drenaje Aguas Lluvias', Categoria:'Aguas Lluvias', Prioridad:'Media', Motivo:'Ley 19.525 está cargada pero falta el reglamento de aplicación' },
  { Tipo:'DS', Numero:'95/2001 MINSEGPRES', Titulo:'Reglamento de Participación Ciudadana en SEIA', Categoria:'Medioambiente', Prioridad:'Media', Motivo:'DS 40 (SEIA) cargado, falta reglamento de participación ciudadana' },
  { Tipo:'DS', Numero:'259/2011 MINEDUC', Titulo:'Reglamento Ley 17.288 — Zonas Típicas y Monumentos', Categoria:'Patrimonio', Prioridad:'Media', Motivo:'Ley 17.288 cargada pero falta el reglamento de zonas típicas' },
  { Tipo:'DS', Numero:'66/2007 MINVU', Titulo:'Reglamento Certificación de Calidad Energética de Viviendas', Categoria:'Eficiencia Energética', Prioridad:'Media', Motivo:'Obligatorio en viviendas nuevas — no está en corpus' },
  // Urbanismo y planificación
  { Tipo:'Ley', Numero:'21.078', Titulo:'Transparencia del Mercado del Suelo e Impuesto al Aumento de Valor', Categoria:'Urbanismo', Prioridad:'Media', Motivo:'Regula plusvalías urbanas y expropiaciones — relevante en grandes proyectos' },
  { Tipo:'Ley', Numero:'18.695', Titulo:'Ley Orgánica Constitucional de Municipalidades', Categoria:'Planificación Urbana', Prioridad:'Baja-Media', Motivo:'Base legal para PRC y facultades municipales en urbanismo' },
  // Planes Reguladores
  { Tipo:'PRC', Numero:'—', Titulo:'Planes Reguladores Comunales — comunas relevantes (Santiago, Las Condes, Providencia, etc.)', Categoria:'Planificación Urbana', Prioridad:'Media', Motivo:'El PRC es el instrumento más consultado por arquitectos — requiere ingesta por comuna' },
  { Tipo:'PRMS', Numero:'100', Titulo:'Plan Regulador Metropolitano de Santiago', Categoria:'Planificación Urbana', Prioridad:'Media', Motivo:'Norma supracomunal que regula usos de suelo en el Gran Santiago' },
  // Higiene y seguridad laboral
  { Tipo:'DS', Numero:'977/1996 MINSAL', Titulo:'Reglamento Sanitario de los Alimentos', Categoria:'Higiene', Prioridad:'Baja-Media', Motivo:'Aplica en proyectos con uso alimentario (restaurantes, cocinerías, hospitales)' },
  { Tipo:'DS', Numero:'289/1989 MINSAL', Titulo:'Reglamento General de Alcantarillados Particulares', Categoria:'Sanitario', Prioridad:'Baja-Media', Motivo:'Proyectos en sectores sin alcantarillado de red pública' },
  // Infraestructura eléctrica
  { Tipo:'DS', Numero:'71/2014 MEN', Titulo:'Reglamento de Concesiones Eléctricas', Categoria:'Infraestructura Eléctrica', Prioridad:'Baja-Media', Motivo:'Servidumbres y fajas eléctricas que condicionan la edificabilidad del terreno' },
  // Con chunks 0
  { Tipo:'Ley', Numero:'20.417', Titulo:'Crea MMA SEA SMA — ESTÁ CARGADA PERO SIN TEXTO EXTRAÍDO', Categoria:'Medioambiente', Prioridad:'Alta', Motivo:'Norma registrada en BD pero con 0 chunks — texto no extraído correctamente, reingestar' },
];

const sheet2 = pendientes.map(p => ({
  'Tipo': p.Tipo,
  'Número / ID': p.Numero,
  'Título': p.Titulo,
  'Categoría': p.Categoria,
  'Prioridad': p.Prioridad,
  'Motivo / Relevancia': p.Motivo,
  'Estado': 'Pendiente'
}));

// ─── SHEET 3: Resumen ─────────────────────────────────────────
const resumen = [
  { Categoría:'Urbanismo y Construcción (LGUC, OGUC, DDUs)', Cargadas: raw.filter(n=>['LGUC','OGUC','DDU','DDU_ESPECIFICA'].includes(n.tipo)).length, Chunks: raw.filter(n=>['LGUC','OGUC','DDU','DDU_ESPECIFICA'].includes(n.tipo)).reduce((s,n)=>s+n.chunks,0), Pendientes: 0, Nota:'Corpus muy completo. 259 DDUs, LGUC y OGUC íntegras.' },
  { Categoría:'Leyes', Cargadas: raw.filter(n=>n.tipo==='Ley').length, Chunks: raw.filter(n=>n.tipo==='Ley').reduce((s,n)=>s+n.chunks,0), Pendientes: 3, Nota:'Falta Ley 20.422 (accesibilidad), 21.078 (suelo), 18.695 (municipalidades)' },
  { Categoría:'Decretos con Fuerza de Ley (DFL)', Cargadas: raw.filter(n=>n.tipo==='DFL').length, Chunks: raw.filter(n=>n.tipo==='DFL').reduce((s,n)=>s+n.chunks,0), Pendientes: 0, Nota:'Completos para el scope actual' },
  { Categoría:'Decretos Ley (DL)', Cargadas: raw.filter(n=>n.tipo==='DL').length, Chunks: raw.filter(n=>n.tipo==='DL').reduce((s,n)=>s+n.chunks,0), Pendientes: 0, Nota:'Completos para el scope actual' },
  { Categoría:'Decretos Supremos / Reglamentos (DS)', Cargadas: raw.filter(n=>n.tipo==='DS').length, Chunks: raw.filter(n=>n.tipo==='DS').reduce((s,n)=>s+n.chunks,0), Pendientes: 8, Nota:'Faltan: DS 50 accesibilidad, DS 46 copropiedad, DS 66 energía, DS 259 patrimonio, DS 95 SEIA participación, DS 19 aguas lluvias, DS 977 alimentos, DS 289 sanitario' },
  { Categoría:'Normas Chilenas (NCh)', Cargadas: 0, Chunks: 0, Pendientes: 5, Nota:'Ninguna cargada. NCh 433 (sísmica) y NCh 430 (hormigón) son críticas y referenciadas en OGUC' },
  { Categoría:'Planes Reguladores (PRC/PRMS)', Cargadas: 0, Chunks: 0, Pendientes: 2, Nota:'No cargados — requieren ingesta por comuna bajo demanda' },
  { Categoría:'Con 0 chunks (error ingesta)', Cargadas: raw.filter(n=>n.chunks===0).length, Chunks: 0, Pendientes: 0, Nota:'Ley 20.417 (Crea MMA SEA SMA) — está registrada pero sin texto. Reingestar.' },
  { Categoría:'TOTAL', Cargadas: raw.length, Chunks: raw.reduce((s,n)=>s+n.chunks,0), Pendientes: 18, Nota:'' },
];

// ─── ARMAR WORKBOOK ───────────────────────────────────────────
const wb = XLSX.utils.book_new();

const ws1 = XLSX.utils.json_to_sheet(cargadas);
ws1['!cols'] = [{wch:16},{wch:20},{wch:55},{wch:28},{wch:8},{wch:8},{wch:14}];
XLSX.utils.book_append_sheet(wb, ws1, 'Cargadas (300)');

const ws2 = XLSX.utils.json_to_sheet(sheet2);
ws2['!cols'] = [{wch:10},{wch:22},{wch:60},{wch:25},{wch:12},{wch:65},{wch:12}];
XLSX.utils.book_append_sheet(wb, ws2, 'Pendientes');

const ws3 = XLSX.utils.json_to_sheet(resumen);
ws3['!cols'] = [{wch:45},{wch:10},{wch:8},{wch:10},{wch:70}];
XLSX.utils.book_append_sheet(wb, ws3, 'Resumen');

const outPath = process.env.USERPROFILE+'/Downloads/revisor-arq-corpus.xlsx';
XLSX.writeFile(wb, outPath);
console.log('Excel guardado en:', outPath);
console.log('Hojas: Cargadas ('+cargadas.length+'), Pendientes ('+sheet2.length+'), Resumen');
