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

/**
 * Detecta si el texto contiene estructura de artículos (LGUC, OGUC, DDU).
 * Patrones: "Artículo 1°", "Art. 2.6.3", "ARTÍCULO 115", "Circular DDU N°..."
 */
const RE_ARTICULO = /^(?:art[ií]culo|art\.|circular\s+ddu\s+n[°º])\s*[\d.]+/im;

/**
 * Extrae artículos como unidades semánticas independientes.
 * Si el texto no tiene estructura de artículos, cae al chunking por párrafos.
 */
function extraerArticulos(texto: string): string[] | null {
  // Detectar separadores de artículo: líneas que empiezan con "Artículo X", "Art. X.X.X"
  const separador = /\n(?=(?:art[ií]culo\s+\d+[°º]?|art\.\s*[\d.]+)\s*[.–\-\s])/gi;

  if (!RE_ARTICULO.test(texto)) return null; // sin estructura de artículos

  const partes = texto.split(separador).map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) return null; // solo encontró un artículo, usar párrafos

  return partes;
}

function chunkearTexto(texto: string): string[] {
  // Intentar extracción por artículos primero
  const articulos = extraerArticulos(texto);
  const unidades = articulos ?? texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  if (!unidades.length) return [];

  const chunks: string[] = [];
  let inicio = 0;

  while (inicio < unidades.length) {
    let fin = inicio;
    let tokens = 0;
    while (fin < unidades.length) {
      const t = estimarTokens(unidades[fin]);
      if (tokens + t > MAX_TOKENS && fin > inicio) break;
      tokens += t;
      fin++;
    }
    if (fin === inicio) fin = inicio + 1;

    chunks.push(unidades.slice(inicio, fin).join("\n\n"));

    // Solapamiento: retroceder hasta cubrir OVERLAP_TOKENS
    let solapTokens = 0;
    let retroceso = fin;
    while (retroceso > inicio + 1) {
      retroceso--;
      solapTokens += estimarTokens(unidades[retroceso]);
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
    // Fase 5: metadatos expandidos (todos opcionales)
    dominio?: string;
    subdominio?: string;
    organo_emisor?: string;
    jerarquia_norm?: string;
    etapas_proyecto?: string[];
    dependencias?: string[];
    alcance?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const {
    tipo, numero, titulo, texto,
    url_fuente = "",
    dominio, subdominio, organo_emisor,
    jerarquia_norm, etapas_proyecto, dependencias, alcance,
  } = body;

  if (!tipo || !numero || !titulo || !texto) {
    return Response.json({ error: "Se requieren tipo, numero, titulo y texto" }, { status: 400 });
  }

  const sb = getSupabaseServiceClient();

  // Construir payload de norma (excluye undefined para no sobreescribir con null)
  const normaPayload: Record<string, unknown> = {
    tipo,
    numero,
    titulo,
    vigente: true,
    fecha_actualizacion: new Date().toISOString(),
  };
  if (url_fuente)          normaPayload.url_fuente       = url_fuente;
  if (dominio)             normaPayload.dominio           = dominio;
  if (subdominio)          normaPayload.subdominio        = subdominio;
  if (organo_emisor)       normaPayload.organo_emisor     = organo_emisor;
  if (jerarquia_norm)      normaPayload.jerarquia_norm    = jerarquia_norm;
  if (etapas_proyecto)     normaPayload.etapas_proyecto   = etapas_proyecto;
  if (dependencias)        normaPayload.dependencias      = dependencias;
  if (alcance)             normaPayload.alcance           = alcance;

  // 1. Upsert norma
  const { data: normaRows, error: normaErr } = await sb
    .from("normas")
    .upsert(normaPayload, { onConflict: "tipo,numero", ignoreDuplicates: false })
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

  // Extraer número de artículo para metadatos (si el chunk empieza con "Art.")
  const RE_ART_NUM = /^(?:art[ií]culo|art\.)\s*([\d.]+[°º]?)/i;

  function extraerNumeroArticulo(texto: string): string | null {
    const m = texto.trimStart().match(RE_ART_NUM);
    return m ? m[1].replace(/[°º]$/, "") : null;
  }

  // Prefijo contextual por chunk
  const textosConPrefijo = textos.map(
    (t, i) => `[${tipo} ${numero}${textos.length > 1 ? ` – parte ${i + 1}/${textos.length}` : ""}]\n${t}`
  );

  // 4. Embeddings via Voyage AI
  // input_type="document" mejora la representación para indexación
  let embeddings: number[][];
  try {
    embeddings = await embedBatch(textosConPrefijo, "document");
  } catch (err) {
    return Response.json({ error: `Error generando embeddings: ${(err as Error).message}` }, { status: 502 });
  }

  // 5. Insertar chunks
  const rows = textos.map((textoOriginal, i) => {
    const articuloNum = extraerNumeroArticulo(textoOriginal);
    return {
      norma_id: normaId,
      texto: textosConPrefijo[i],
      tokens: estimarTokens(textosConPrefijo[i]),
      orden: i,
      metadatos: {
        tipo_norma: tipo,
        numero_norma: numero,
        url_fuente,
        ...(articuloNum ? { articulo: articuloNum } : {}),
      },
      fuente: url_fuente,
      embedding: embeddings[i],
    };
  });

  const { error: insertErr } = await sb.from("chunks").insert(rows);
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  return Response.json({ ok: true, normaId, chunks: rows.length });
}
