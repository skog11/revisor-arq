/**
 * POST /api/corpus/extraer-texto
 * Recibe un archivo (multipart/form-data, campo "file") y devuelve el texto extraído.
 * Soporta: .pdf (pdf-parse) y .txt / .md (texto plano).
 */

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el formulario" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "Falta el campo 'file'" }, { status: 400 });

  const nombre = file.name.toLowerCase();
  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Texto plano
  if (nombre.endsWith(".txt") || nombre.endsWith(".md")) {
    const texto = new TextDecoder("utf-8").decode(buffer);
    return Response.json({ texto: texto.trim() });
  }

  // PDF
  if (nombre.endsWith(".pdf")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      return Response.json({ texto: data.text.trim() });
    } catch (e) {
      return Response.json({ error: `Error al parsear PDF: ${(e as Error).message}` }, { status: 500 });
    }
  }

  return Response.json({ error: "Formato no soportado. Use .pdf, .txt o .md" }, { status: 400 });
}
