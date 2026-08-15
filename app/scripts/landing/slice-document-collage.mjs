import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "landing", "archivo-normativo-collage-v2.png");
const outputDir = path.join(root, "public", "landing", "documents");

const documents = [
  { id: "plan-regulador", box: [70, 35, 405, 500], points: [[45, 40], [345, 0], [405, 420], [70, 500]] },
  { id: "certificado", box: [390, 0, 365, 330], points: [[10, 18], [345, 0], [365, 285], [32, 330]] },
  { id: "plano-edificacion", box: [790, 0, 390, 440], points: [[15, 0], [390, 5], [355, 440], [0, 415]] },
  { id: "planta-arquitectura", box: [1085, 0, 415, 460], points: [[20, 0], [415, 12], [390, 460], [0, 438]] },
  { id: "ordenanza-local", box: [1400, 80, 272, 410], points: [[25, 0], [272, 35], [272, 410], [0, 355]] },
  { id: "distanciamientos", box: [555, 225, 480, 405], points: [[30, 35], [450, 0], [480, 360], [0, 405]] },
  { id: "rasante", box: [345, 455, 410, 305], points: [[25, 5], [390, 0], [410, 295], [0, 305]] },
  { id: "permiso-edificacion", box: [1310, 350, 362, 360], points: [[35, 0], [362, 45], [362, 360], [0, 320]] },
  { id: "cuadro-normativo", box: [0, 590, 430, 351], points: [[20, 25], [385, 0], [430, 330], [0, 351]] },
  { id: "subdivision-predial", box: [410, 665, 430, 276], points: [[20, 25], [405, 0], [430, 276], [0, 276]] },
  { id: "croquis-emplazamiento", box: [785, 605, 430, 336], points: [[35, 0], [430, 70], [405, 336], [0, 300]] },
  { id: "elevacion-oriente", box: [1135, 665, 537, 276], points: [[25, 0], [537, 15], [537, 276], [0, 276]] },
];

// NO agregar recortes rectangulares tomados del medio del monton: se ven como
// hojas cercenadas flotando con sombra propia. Cada entrada de esta lista debe
// ser un documento completo, con su poligono siguiendo el borde real de la
// hoja. Si hacen falta mas papeles para cubrir la pantalla, la salida correcta
// es agrandar los que ya hay (que sangren fuera del viewport, como en la foto
// original) o generar un collage nuevo con mas documentos.

await fs.mkdir(outputDir, { recursive: true });

for (const document of documents) {
  const [left, top, width, height] = document.box;
  const polygon = document.points.map(([x, y]) => `${x},${y}`).join(" ");
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${polygon}" fill="white"/></svg>`,
  );
  const output = path.join(outputDir, `${document.id}.png`);

  await sharp(source)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(output);

  const metadata = await sharp(output).metadata();
  console.log(`${document.id}: ${metadata.width}x${metadata.height}`);
}
