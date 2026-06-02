import pdf from "pdf-parse";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CHARS = 8_000;

const IMAGE_TYPES: Record<string, string> = {
  "image/png":  "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
};

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  ...Object.keys(IMAGE_TYPES),
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    if (!SUPPORTED_TYPES.has(file.type)) {
      return Response.json({ error: "Tipo no soportado. Use PDF, imagen (PNG/JPG/WebP) o TXT." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // PDF → pdf-parse (sin API key, siempre funciona)
    if (file.type === "application/pdf") {
      const result = await pdf(buffer);
      const texto = result.text.slice(0, MAX_CHARS);
      return Response.json({ text: texto, paginas: result.numpages, truncado: result.text.length > MAX_CHARS });
    }

    // Texto plano
    if (file.type === "text/plain") {
      const texto = buffer.toString("utf-8").slice(0, MAX_CHARS);
      return Response.json({ text: texto });
    }

    // Imágenes → Gemini Flash multimodal
    const mediaType = IMAGE_TYPES[file.type];
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extrae todo el texto y datos normativos de esta imagen. Preserva superficies, coeficientes, normativas y datos del proyecto. Solo el texto estructurado, sin saludos." },
          { type: "file", data: new Uint8Array(buffer), mediaType },
        ],
      }],
    });
    return Response.json({ text });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error parseando documento:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
