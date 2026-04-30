/**
 * POST /api/corpus/ingestar
 * Crea una norma nueva y genera sus chunks con embeddings.
 *
 * Body JSON:
 *   tipo     string   — ej. "LGUC", "OGUC", "DDU", "SECTORIAL", etc.
 *   numero   string   — ej. "21.450" o "DDU-85"
 *   titulo   string   — título completo
 *   texto    string   — texto completo de la norma (plano)
 *   url      string?  — URL fuente opcional
 *
 * Usa Gemini embedding-001 (mismo modelo que el retrieval) con 1024 dimensiones.
 * El texto se parte en chunks de ~600 caracteres respetando límites de párrafo.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";

const CHUNK_TARGET = 600;   // caracteres aprox por chunk
const CHUNK_OVERLAP = 80;   // superposición entre chunks

// ─── Chunking ────────────────────────────────────────────────────────────────

function chunkText(texto: string): string[] {
  // Divide por párrafos (doble salto de línea o salto simple largo)
  const parrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let buffer = "";

  for (const parrafo of parrafos) {
    if (buffer.length + parrafo.length + 1 > CHUNK_TARGET && buffer.length > 0) {
      chunks.push(buffer.trim());
      // Overlap: mantener últimas palabras del chunk anterior
      const words = buffer.split(" ");
      buffer = words.slice(-Math.floor(CHUNK_OVERLAP / 6)).join(" ") + "\n" + parrafo;
    } else {
      buffer = buffer ? buffer + "\n" + parrafo : parrafo;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());

  // Si el texto no tiene párrafos (todo seguido), partir por tamaño
  if (chunks.length === 0 && texto.trim()) {
    for (let i = 0; i < texto.length; i += CHUNK_TARGET - CHUNK_OVERLAP) {
      chunks.push(texto.slice(i, i + CHUNK_TARGET).trim());
    }
  }

  return chunks.filter((c) => c.length > 20);
}

// ─── Embedding (Gemini — mismo modelo que retrieval) ─────────────────────────

async function embedTexto(texto: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { role: "user", parts: [{ text: texto }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 1024,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedding error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { embedding: { values: number[] } };
  return json.embedding.values;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: {
    tipo: string;
    numero: string;
    titulo: string;
    texto: string;
    url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { tipo, numero, titulo, texto, url } = body;

  if (!tipo || !numero || !titulo || !texto) {
    return Response.json(
      { error: "Faltan campos obligatorios: tipo, numero, titulo, texto" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServiceClient();

  // 1. Crear norma
  const { data: norma, error: errNorma } = await sb
    .from("normas")
    .insert({
      tipo: tipo.toUpperCase().trim(),
      numero: numero.trim(),
      titulo: titulo.trim(),
      vigente: true,
      fecha_actualizacion: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (errNorma || !norma) {
    return Response.json(
      { error: `Error al crear norma: ${errNorma?.message}` },
      { status: 500 }
    );
  }

  const normaId = norma.id as string;

  // 2. Partir en chunks
  const chunks = chunkText(texto);

  if (chunks.length === 0) {
    // Revertir norma creada
    await sb.from("normas").delete().eq("id", normaId);
    return Response.json({ error: "El texto no produjo chunks válidos" }, { status: 400 });
  }

  // 3. Generar embeddings e insertar chunks
  const errores: string[] = [];
  let insertados = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedding = await embedTexto(chunk);

      const { error: errChunk } = await sb.from("chunks").insert({
        norma_id: normaId,
        texto: chunk,
        embedding,
        fuente: url ?? "",
        metadatos: { indice: i, total: chunks.length },
      });

      if (errChunk) {
        errores.push(`Chunk ${i}: ${errChunk.message}`);
      } else {
        insertados++;
      }
    } catch (e) {
      errores.push(`Chunk ${i}: ${(e as Error).message}`);
    }
  }

  // Actualizar fecha_actualizacion con el conteo final
  await sb
    .from("normas")
    .update({ fecha_actualizacion: new Date().toISOString() })
    .eq("id", normaId);

  return Response.json({
    ok: true,
    normaId,
    totalChunks: chunks.length,
    insertados,
    errores: errores.length > 0 ? errores : undefined,
  });
}
