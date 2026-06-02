import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf":  "application/pdf",
  "image/png":        "image/png",
  "image/jpeg":       "image/jpeg",
  "image/webp":       "image/webp",
  "text/plain":       "text/plain",
};

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    const mediaType = SUPPORTED_TYPES[file.type];
    if (!mediaType) {
      return Response.json({ error: "Tipo de archivo no soportado. Use PDF, imagen o TXT." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });
    }

    const uint8Array = new Uint8Array(await file.arrayBuffer());

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrae todo el texto útil de este documento para un análisis normativo. Preserva la estructura, números, superficies, normativas y datos del proyecto. Si es un plano o imagen técnica, describe los cuadros de superficie y normativos. Devuelve solo el texto estructurado, sin saludos ni explicaciones.",
            },
            {
              type: "file",
              data: uint8Array,
              mediaType,
            },
          ],
        },
      ],
    });

    return Response.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error parseando documento:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
