import pdf from "pdf-parse";
import { NextRequest } from "next/server";

const MAX_CHARS = 8_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return Response.json({ error: "Solo se aceptan archivos PDF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdf(buffer);
    const texto = result.text.slice(0, MAX_CHARS);

    return Response.json({
      text: texto,
      paginas: result.numpages,
      truncado: result.text.length > MAX_CHARS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error parseando documento:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
