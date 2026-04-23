/**
 * POST /api/corpus/ingestar
 * Body: { tipo: string; numero: string; titulo: string; texto: string; url_fuente?: string }
 * 1. Upsert norma en Supabase.
 * 2. Elimina chunks previos para esa norma.
 * 3. Divide texto en chunks de ~800 tokens con solapamiento.
 * 4. Genera embeddings con Voyage AI.
 * 5. Inserta chunks en Supabase.
 */

import { getSupabaseServiceClient } from "@/lib/supabase";
import { embedBatch } from "@/lib/voyage";
import { NextRequest } from "next/server";

const MAX_TOKENS = 800;
const OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

function estimarTokens(s: string) {
  return Math.ceil(s.length / CHARS_PER_TOKEN);
}

function chunkearTexto(texto: string): string[] {
  const parrafos = texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parrafos.length) return [];

  const chunks: string[] = [];
  let inicio = 0;

  while (inicio < parrafos.length) {
    let fin = inicio;
    let tokens = 0;
    while (fin < parrafos.length) {
      const t = estimarTokens(parrafos[fin]);
      if (tokens + t > MAX_TOKENS && fin > inicio) break;
      tokens += t;
      fin++;
    }
    if (fin === inicio) fin = inicio + 1;

    chunks.push(parrafos.slice(inicio, fin).join("\n\n"));

    // Solapamiento: retroceder hasta cubrir OVERLAP_TOKENS
    let solapTokens = 0;
    let retroceso = fin;
    while (retroceso > inicio + 1) {
      retroceso--;
      solapTokens += estimarTokens(parrafos[retroceso]);
      if (solapTokens >= OVERLAP_TOKENS) break;
    }
    inicio = retroceso >= fin ? fin : retroceso;
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  let body: {
    tipo?: string;
    numero?: string;
    titulo?: string;
    texto?: string;
    url_fuente?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { tipo, numero, titulo, texto, url_fuente = "" } = body;
  if (!tipo || !numero || !titulo || !texto) {
    return Response.json({ error: "Se requieren tipo, numero, titulo y texto" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();

  // 1. Upsert norma
  const { data: normaRows, error: normaErr } = await sb
    .from("normas")
    .upsert(
      { tipo, numero, titulo, vigente: true, fecha_actualizacion: new Date().toISOString() },
      { onConflict: "tipo,numero", ignoreDuplicates: false }
    )
    .select("id");

  if (normaErr || !normaRows?.length) {
    return Response.json({ error: normaErr?.message ?? "Error upserting norma" }, { status: 500 });
  }

  const normaId = normaRows[0].id as string;

  // 2. Eliminar chunks previos
  const { error: delErr } = await sb.from("chunks").delete().eq("norma_id", normaId);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  // 3. Dividir en chunks
  const textos = chunkearTexto(texto);
  if (!textos.length) {
    return Response.json({ error: "El texto no produjo chunks válidos" }, { status: 422 });
  }

  // Prefijo contextual por chunk
  const textosConPrefijo = textos.map(
    (t, i) => `[${tipo} ${numero}${textos.length > 1 ? ` – parte ${i + 1}/${textos.length}` : ""}]\n${t}`
  );

  // 4. Embeddings via Voyage AI
  let embeddings: number[][];
  try {
    embeddings = await embedBatch(textosConPrefijo);
  } catch (err) {
    return Response.json({ error: `Error generando embeddings: ${(err as Error).message}` }, { status: 502 });
  }

  // 5. Insertar chunks
  const rows = textosConPrefijo.map((t, i) => ({
    norma_id: normaId,
    texto: t,
    tokens: estimarTokens(t),
    orden: i,
    metadatos: { tipo_norma: tipo, numero_norma: numero, url_fuente },
    fuente: url_fuente,
    embedding: embeddings[i],
  }));

  const { error: insertErr } = await sb.from("chunks").insert(rows);
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  return Response.json({ ok: true, normaId, chunks: rows.length });
}
