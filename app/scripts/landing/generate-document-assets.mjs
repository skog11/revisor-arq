import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDir = path.join(process.cwd(), "public", "landing", "documents-v2");

const escapeXml = (value) => value.replace(/[<>&'"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
})[character]);

function paperFrame(width, height, title, subtitle, content) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="7" result="noise"/>
          <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
          <feComponentTransfer in="mono" result="faint"><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer>
          <feBlend in="SourceGraphic" in2="faint" mode="multiply"/>
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="5" dy="8" stdDeviation="7" flood-color="#3b3125" flood-opacity="0.22"/>
        </filter>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#667078" stroke-opacity="0.16" stroke-width="1"/>
        </pattern>
      </defs>
      <g filter="url(#shadow)">
        <rect x="18" y="18" width="${width - 42}" height="${height - 44}" rx="2" fill="#eee7d9" stroke="#82786a" stroke-width="1.4" filter="url(#paper)"/>
        <rect x="38" y="38" width="${width - 82}" height="${height - 84}" fill="url(#grid)" stroke="#8a8174" stroke-width="1"/>
        <text x="52" y="68" fill="#292924" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="1.2">${escapeXml(title)}</text>
        <text x="52" y="89" fill="#615b52" font-family="Arial, sans-serif" font-size="9" letter-spacing="0.8">${escapeXml(subtitle)}</text>
        <path d="M52 101H${width - 54}" stroke="#676057" stroke-width="1"/>
        ${content}
        <g transform="translate(${width - 112} ${height - 105}) rotate(-8)">
          <circle r="35" fill="none" stroke="#486678" stroke-opacity="0.42" stroke-width="2"/>
          <circle r="28" fill="none" stroke="#486678" stroke-opacity="0.34"/>
          <text y="-2" text-anchor="middle" fill="#486678" fill-opacity="0.58" font-family="Arial" font-size="7" font-weight="700">DIRECCIÓN DE OBRAS</text>
          <text y="9" text-anchor="middle" fill="#486678" fill-opacity="0.58" font-family="Arial" font-size="6">REVISOR ARQ</text>
        </g>
      </g>
    </svg>`;
}

function floorPlan(width, height) {
  const x = 62;
  const y = 126;
  const w = width - 126;
  const h = height - 218;
  return `
    <g fill="none" stroke="#3b4142" stroke-width="2">
      <rect x="${x}" y="${y}" width="${w}" height="${h}"/>
      <path d="M${x + w * 0.36} ${y}V${y + h}M${x + w * 0.7} ${y}V${y + h}"/>
      <path d="M${x} ${y + h * 0.42}H${x + w}M${x} ${y + h * 0.72}H${x + w}"/>
      <path d="M${x + 12} ${y + 12}H${x + w - 12}V${y + h - 12}H${x + 12}Z" stroke-width="0.8"/>
    </g>
    <g fill="#4e5657" font-family="Arial" font-size="8">
      <text x="${x + 12}" y="${y + 25}">RECINTO 01</text><text x="${x + w * 0.4}" y="${y + 25}">RECINTO 02</text>
      <text x="${x + 12}" y="${y + h * 0.5}">ACCESO</text><text x="${x + w * 0.73}" y="${y + h * 0.5}">SERVICIOS</text>
    </g>`;
}

function urbanPlan(width, height) {
  return `
    <g transform="translate(48 116)" fill="none" stroke="#3f4749">
      <path d="M15 35C120 15 145 88 245 66S${width - 90} 18 ${width - 80} 55" stroke-width="12" stroke="#d5d1c7"/>
      <path d="M15 35C120 15 145 88 245 66S${width - 90} 18 ${width - 80} 55" stroke-width="1.2"/>
      <path d="M32 2V${height - 205}M115 0V${height - 210}M210 16V${height - 220}M310 0V${height - 198}" stroke-width="6" stroke="#dbd7ce"/>
      <path d="M32 2V${height - 205}M115 0V${height - 210}M210 16V${height - 220}M310 0V${height - 198}" stroke-width="0.8"/>
      <g fill="#d2c8b7" stroke-width="0.8">
        <rect x="45" y="92" width="55" height="52"/><rect x="130" y="100" width="62" height="42"/>
        <rect x="225" y="92" width="67" height="63"/><rect x="45" y="175" width="55" height="54"/>
        <rect x="130" y="172" width="62" height="59"/><rect x="225" y="182" width="67" height="48"/>
      </g>
    </g>`;
}

function sectionPlan(width, height) {
  return `
    <g transform="translate(48 130)" fill="none" stroke="#353b3c">
      <path d="M0 ${height - 230}H${width - 96}" stroke-width="2"/>
      <path d="M35 ${height - 230}V95H${width - 155}V${height - 230}" stroke-width="3"/>
      <path d="M35 155H${width - 155}M35 218H${width - 155}"/>
      <path d="M${width - 130} ${height - 230}L${width - 80} 40" stroke="#b65a3b" stroke-dasharray="6 5"/>
      <path d="M15 ${height - 230}V95M7 95H23M7 ${height - 230}H23" stroke-width="0.8"/>
      <text x="22" y="145" fill="#4c5354" font-family="Arial" font-size="8" transform="rotate(-90 22 145)">ALTURA MÁXIMA</text>
    </g>`;
}

function tablePlan(width, height) {
  const rows = ["SUPERFICIE PREDIAL MÍNIMA", "ALTURA MÁXIMA", "COEF. CONSTRUCTIBILIDAD", "OCUPACIÓN DE SUELO", "ANTEJARDÍN", "ESTACIONAMIENTOS"];
  return `
    <g transform="translate(52 125)" font-family="Arial" font-size="8" fill="#404546">
      <rect width="${width - 106}" height="${rows.length * 42 + 42}" fill="#eee9df" stroke="#555b5c"/>
      <path d="M0 42H${width - 106}M${(width - 106) * 0.7} 0V${rows.length * 42 + 42}" stroke="#555b5c"/>
      <text x="10" y="26" font-weight="700">CONDICIÓN NORMATIVA</text><text x="${(width - 106) * 0.74}" y="26" font-weight="700">VALOR</text>
      ${rows.map((row, index) => `<path d="M0 ${84 + index * 42}H${width - 106}" stroke="#777" stroke-width="0.7"/><text x="10" y="${69 + index * 42}">${row}</text><text x="${(width - 106) * 0.74}" y="${69 + index * 42}">${["250 m²", "14 m", "2,4", "0,60", "5 m", "1 / 75 m²"][index]}</text>`).join("")}
    </g>`;
}

function legalText(width, height) {
  const lines = [
    "VISTOS: Las disposiciones aplicables al instrumento de planificación",
    "territorial, los antecedentes técnicos acompañados y la normativa vigente.",
    "CONSIDERANDO: Que corresponde verificar el fundamento normativo exacto",
    "de cada condición urbanística informada para el predio consultado.",
    "SE RESUELVE: La respuesta deberá identificar norma, artículo y fragmento",
    "literal, declarando expresamente cualquier ausencia de respaldo verificable.",
  ];
  return `<g transform="translate(54 126)" fill="#424646" font-family="Georgia, serif" font-size="10">
    ${lines.map((line, index) => `<text y="${24 + index * 31}">${escapeXml(line)}</text>`).join("")}
    <path d="M0 ${height - 235}H${width - 110}" stroke="#626666"/>
    <text y="${height - 205}" font-family="Arial" font-size="8">PRONUNCIAMIENTO TÉCNICO · UNIDAD JURÍDICA</text>
  </g>`;
}

const documents = [
  ["plan-regulador", 520, 600, "PLAN REGULADOR COMUNAL", "LÁMINA URBANA · ESCALA 1:2.500", urbanPlan],
  ["certificado", 390, 340, "CERTIFICADO DE INFORMACIONES PREVIAS", "DIRECCIÓN DE OBRAS MUNICIPALES", tablePlan],
  ["plano-edificacion", 500, 470, "PLANO DE EDIFICACIÓN", "PLANTA NIVEL 01 · ESCALA 1:100", floorPlan],
  ["planta-arquitectura", 520, 480, "PLANTA DE ARQUITECTURA", "EXPEDIENTE DE PERMISO", floorPlan],
  ["ordenanza-local", 350, 510, "ORDENANZA LOCAL", "NORMAS URBANÍSTICAS · ARTÍCULO 2.1.4", tablePlan],
  ["distanciamientos", 500, 420, "DISTANCIAMIENTOS", "FRONTAL 5 m · LATERAL 3 m · ART. 6.1.3", floorPlan],
  ["rasante", 440, 340, "RASANTE", "ÁNGULO Y ALTURA MÁXIMA · ART. 2.6.3", sectionPlan],
  ["permiso-edificacion", 400, 410, "PERMISO DE EDIFICACIÓN", "EXPEDIENTE N° 005123", tablePlan],
  ["cuadro-normativo", 470, 370, "CUADRO NORMATIVO", "ZONA E-AM · PARÁMETROS DEL PROYECTO", tablePlan],
  ["subdivision-predial", 470, 310, "SUBDIVISIÓN PREDIAL", "LOTES Y SUPERFICIES RESULTANTES", floorPlan],
  ["croquis-emplazamiento", 490, 370, "CROQUIS DE EMPLAZAMIENTO", "PREDIO, VIALIDAD Y NORTE", urbanPlan],
  ["elevacion-oriente", 610, 310, "ELEVACIÓN ORIENTE", "ESCALA 1:100 · COTAS EN METROS", sectionPlan],
  ["dictamen-cgr", 430, 510, "DICTAMEN TÉCNICO", "PRONUNCIAMIENTO N° E245781 · CONTRALORÍA", legalText],
  ["informe-tecnico", 470, 440, "INFORME TÉCNICO", "REVISIÓN DE ANTECEDENTES DEL PROYECTO", sectionPlan],
  ["memoria-calculo", 430, 390, "MEMORIA DE CÁLCULO", "SUPERFICIES Y PARÁMETROS URBANÍSTICOS", tablePlan],
  ["recepcion-definitiva", 420, 410, "RECEPCIÓN DEFINITIVA", "CERTIFICADO DE OBRAS EJECUTADAS", floorPlan],
];

function basePlanSvg() {
  return paperFrame(1672, 941, "PLANO BASE COMUNAL", "CATASTRO URBANO Y PREDIAL · ESCALA 1:5.000", urbanPlan(1672, 941));
}

function rulerSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="92" viewBox="0 0 720 92"><defs><filter id="s"><feDropShadow dx="4" dy="6" stdDeviation="4" flood-opacity=".25"/></filter></defs><g filter="url(#s)"><path d="M18 14H702V70H18Z" fill="#d8c39d" fill-opacity=".86" stroke="#665b4d"/><path d="M30 14V40${Array.from({ length: 33 }, (_, index) => `M${50 + index * 20} 14V${index % 5 === 0 ? 52 : 35}`).join("")}" stroke="#4e463b"/><text x="34" y="63" font-family="Arial" font-size="9" fill="#51483c">ESCALA MÉTRICA 1:100</text></g></svg>`;
}

function pencilSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="78" viewBox="0 0 620 78"><defs><filter id="s"><feDropShadow dx="4" dy="5" stdDeviation="4" flood-opacity=".3"/></filter></defs><g filter="url(#s)" transform="translate(14 12)"><path d="M8 23L65 2H550L594 23L550 44H65Z" fill="${color}" stroke="#493d33"/><path d="M8 23L65 2V44Z" fill="#d8b988"/><path d="M8 23L28 15V31Z" fill="#252525"/><path d="M550 2L594 23L550 44Z" fill="#c4b5a2"/><path d="M88 6V40" stroke="#fff" stroke-opacity=".42"/><text x="120" y="29" font-family="Arial" font-size="12" letter-spacing="3" fill="#fff" fill-opacity=".72">REVISOR ARQ · 2H</text></g></svg>`;
}

await mkdir(outputDir, { recursive: true });
await sharp(Buffer.from(basePlanSvg())).png().toFile(path.join(outputDir, "plano-base.png"));

for (const [id, width, height, title, subtitle, renderer] of documents) {
  const svg = paperFrame(width, height, title, subtitle, renderer(width, height));
  await sharp(Buffer.from(svg)).png().toFile(path.join(outputDir, `${id}.png`));
}

await sharp(Buffer.from(rulerSvg())).png().toFile(path.join(outputDir, "regla.png"));
await sharp(Buffer.from(pencilSvg("#ad3f2d"))).png().toFile(path.join(outputDir, "lapiz-rojo.png"));
await sharp(Buffer.from(pencilSvg("#24333b"))).png().toFile(path.join(outputDir, "lapiz-negro.png"));

console.log(`Generated ${documents.length + 4} independent assets in ${outputDir}`);
