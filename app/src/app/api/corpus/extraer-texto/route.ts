/**
 * POST /api/corpus/extraer-texto
 * Body: FormData con campo "file" (PDF)
 * Retorna: { texto: string }
 * Extrae texto plano de un PDF usando pdf-parse.
 */

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el FormData" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Se requiere un campo 'file' con el PDF" }, { status: 400 });
  }

  const extensionOk = file.name.toLowerCase().endsWith(".pdf");
  const mimeOk = !file.type || file.type === "application/pdf";
  if (!extensionOk || !mimeOk) {
    return Response.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
  }

  // Límite: 20 MB (los PDFs de normativa legal rara vez superan 5 MB)
  const MAX_SIZE_MB = 20;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json(
      { error: `El archivo supera el límite de ${MAX_SIZE_MB} MB. Comprime el PDF o divídelo en partes.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  let texto: string;
  try {
    const result = await pdfParse(buffer);
    texto = result.text.trim();
  } catch (err) {
    return Response.json({ error: `Error al parsear el PDF: ${(err as Error).message}` }, { status: 422 });
  }

  if (!texto) {
    return Response.json({ error: "El PDF no contiene texto extraíble" }, { status: 422 });
  }

  return Response.json({ texto });
}
