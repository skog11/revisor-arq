/**
 * Pipeline de ingesta principal.
 *
 * Flujo por norma:
 *   1. Lee manifiesto del corpus → detecta nuevos o modificados (por hash).
 *   2. Parsea el archivo .txt según tipo (LGUC, OGUC, DDU, DDU_ESPECIFICA).
 *   3. Divide en chunks semánticos con solapamiento.
 *   4. Embeds con Voyage AI en batches de 32.
 *   5. Upsert en tabla `normas` → obtiene norma_id.
 *   6. Elimina chunks anteriores WHERE norma_id = X.
 *   7. Inserta nuevos chunks con norma_id + metadatos jsonb.
 *
 * Flags:
 *   --dry         Solo parsea y muestra stats, no toca Supabase.
 *   --solo=KEY    Procesa solo la norma con esa key (ej. "LGUC", "DDU-227").
 *   --force       Reprocesa aunque el hash no haya cambiado.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { loadManifiesto, CORPUS_ROOT } from "../download/manifiesto";
import { parseLGUCFile, parseOGUCFile } from "./parsers/lguc-oguc";
import { parseDDUFile } from "./parsers/ddu";
import { parseLey } from "./parsers/ley";
import { chunkearNorma } from "./chunker";
import { embedTextos } from "./embedder";
import { embedTextosOllama } from "./embedder-ollama";
import { embedTextosTransformers } from "./embedder-transformers";
import type { TipoNorma } from "./types";

const BETWEEN_NORMAS_MS = 1_500; // Reducido de 20s a 1.5s (más ágil)

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsearArgs() {
  const args = process.argv.slice(2);
  return {
    dry: args.includes("--dry"),
    force: args.includes("--force"),
    ollama: args.includes("--ollama"),
    local: args.includes("--local"),
    solo: args.find((a) => a.startsWith("--solo="))?.split("=")[1],
  };
}

function hashDeArchivo(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

function tipoNormaDeKey(key: string): TipoNorma {
  if (key === "LGUC") return "LGUC";
  if (key === "OGUC") return "OGUC";
  if (key.startsWith("DDU-ESP-")) return "DDU_ESPECIFICA";
  if (key.startsWith("DDU-")) return "DDU";
  if (key.startsWith("LEY-")) return "LEY";
  if (key.startsWith("DFL-")) return "DFL";
  if (key.startsWith("DL-")) return "DL";
  if (key.startsWith("DS-")) return "DS";
  return "DDU"; // fallback
}

// ─── Operaciones Supabase ─────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

/**
 * Busca o crea una norma en la tabla `normas`.
 * Retorna el UUID de la norma.
 */
async function upsertNormaGetId(
  sb: SupabaseClient,
  opts: {
    tipo: TipoNorma;
    numero: string;
    titulo: string;
    url_fuente: string;
    fecha_publicacion?: string;
    hash_contenido: string;
  }
): Promise<string> {
  // Buscar existente
  const { data: existing } = await sb
    .from("normas")
    .select("id")
    .eq("tipo", opts.tipo)
    .eq("numero", opts.numero)
    .maybeSingle();

  if (existing?.id) {
    // Actualizar
    const { error } = await sb
      .from("normas")
      .update({
        titulo: opts.titulo,
        url_fuente: opts.url_fuente,
        fecha_publicacion: opts.fecha_publicacion ?? null,
        hash_contenido: opts.hash_contenido,
        fecha_actualizacion: new Date().toISOString().split("T")[0],
        vigente: true,
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Error actualizando norma: ${error.message}`);
    return existing.id as string;
  }

  // Insertar nueva
  const { data: inserted, error } = await sb
    .from("normas")
    .insert({
      tipo: opts.tipo,
      numero: opts.numero,
      titulo: opts.titulo,
      url_fuente: opts.url_fuente,
      fecha_publicacion: opts.fecha_publicacion ?? null,
      hash_contenido: opts.hash_contenido,
      fecha_actualizacion: new Date().toISOString().split("T")[0],
      vigente: true,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(`Error insertando norma: ${error?.message}`);
  return inserted.id as string;
}

async function eliminarChunksDeNorma(sb: SupabaseClient, normaId: string) {
  const { error } = await sb.from("chunks").delete().eq("norma_id", normaId);
  if (error) throw new Error(`Error eliminando chunks: ${error.message}`);
}

async function insertarChunks(
  sb: SupabaseClient,
  normaId: string,
  chunks: ReturnType<typeof chunkearNorma>,
  embeddings: number[][]
) {
  const BATCH_INSERT = 25;

  for (let i = 0; i < chunks.length; i += BATCH_INSERT) {
    const batch = chunks.slice(i, i + BATCH_INSERT);
    const embBatch = embeddings.slice(i, i + BATCH_INSERT);

    const rows = batch.map((c, idx) => ({
      norma_id: normaId,
      texto: c.texto.replace(/\u0000/g, ""), // Limpiar caracteres nulos que rompen Postgres
      tokens: c.tokens,
      orden: c.orden,
      embedding: embBatch[idx],
      metadatos: {
        tipo_norma: c.metadatos.tipo_norma,
        numero_norma: c.metadatos.numero_norma,
        articulo: c.metadatos.articulo ?? null,
        titulo_articulo: c.metadatos.titulo_articulo ?? null,
        jerarquia: c.metadatos.jerarquia ?? null,
        url_fuente: c.metadatos.url_fuente,
      },
      fecha_vigencia_desde: c.fecha_vigencia_desde ?? null,
      fecha_vigencia_hasta: c.fecha_vigencia_hasta ?? null,
      fuente: c.fuente,
    }));

    const { error } = await sb.from("chunks").insert(rows);
    if (error) throw new Error(`Error insertando chunks (offset ${i}): ${error.message}`);
  }
}

// ─── Procesamiento de una norma ───────────────────────────────────────────────

async function procesarNorma(
  key: string,
  opts: { dry: boolean; force: boolean; ollama: boolean; local: boolean }
): Promise<{ key: string; chunks: number; status: string }> {
  const manifiesto = loadManifiesto();
  const entry = manifiesto[key];

  if (!entry) return { key, chunks: 0, status: "sin entrada en manifiesto" };
  if (!existsSync(entry.archivo)) return { key, chunks: 0, status: "archivo no encontrado" };

  // Detectar cambios por hash
  const hashActual = hashDeArchivo(entry.archivo);
  const statePath = join(CORPUS_ROOT, "ingest-state.json");
  let ingestState: Record<string, string> = {};
  if (existsSync(statePath)) {
    try { ingestState = JSON.parse(readFileSync(statePath, "utf-8")); } catch { /* ignore */ }
  }

  if (!opts.force && ingestState[key] === hashActual) {
    return { key, chunks: 0, status: "sin cambios (ya procesado)" };
  }

  const tipo = tipoNormaDeKey(key);

  // ── Parseo ──
  console.log(`\n  📄 Parseando ${key} (${tipo})...`);
  let norma: ReturnType<typeof parseLGUCFile>;
  try {
    if (tipo === "LGUC") {
      norma = parseLGUCFile(entry.archivo, entry.url_fuente);
    } else if (tipo === "OGUC") {
      norma = parseOGUCFile(entry.archivo, entry.url_fuente);
    } else if (["LEY", "DFL", "DL", "DS"].includes(tipo)) {
      // Inferir número desde la key (ej. "LEY-19300" → "19300")
      const numero = key.split("-").slice(1).join("-");
      norma = parseLey(entry.archivo, {
        tipo,
        numero,
        titulo: entry.titulo ?? key,
        url_fuente: entry.url_fuente,
        fecha_publicacion: entry.fecha_publicacion,
      });
    } else {
      norma = parseDDUFile(entry.archivo, entry.url_fuente, key, tipo);
    }
  } catch (err) {
    return { key, chunks: 0, status: `error parseo: ${(err as Error).message.slice(0, 80)}` };
  }

  console.log(`     ${norma.articulos.length} artículos/secciones`);
  if (norma.articulos.length === 0) return { key, chunks: 0, status: "parser sin artículos" };

  // ── Chunking ──
  const chunks = chunkearNorma(norma);
  console.log(`     ${chunks.length} chunks generados`);

  if (opts.dry) {
    console.log("     [DRY] Muestra de 2 chunks:");
    for (const c of chunks.slice(0, 2)) {
      console.log(`       Art ${c.metadatos.articulo}: ${c.texto.slice(0, 100).replace(/\n/g, " ")}…`);
      console.log(`       tokens≈${c.tokens}`);
    }
    return { key, chunks: chunks.length, status: "dry-run OK" };
  }

  // ── Embedding ──
  const textos = chunks.map((c) => c.texto);
  let embeddings: number[][];
  try {
    if (opts.local) {
      embeddings = await embedTextosTransformers(textos, `[${key}]`);
    } else if (opts.ollama) {
      embeddings = await embedTextosOllama(textos, `[${key}]`);
    } else {
      embeddings = await embedTextos(textos, `[${key}]`);
    }
  } catch (err) {
    return { key, chunks: 0, status: `error embedding: ${(err as Error).message.slice(0, 80)}` };
  }

  // ── Supabase ──
  const sb = getSupabaseClient();
  let normaId: string;

  try {
    normaId = await upsertNormaGetId(sb, {
      tipo: norma.tipo,
      numero: norma.numero,
      titulo: norma.titulo,
      url_fuente: norma.url_fuente,
      fecha_publicacion: norma.fecha_publicacion,
      hash_contenido: hashActual,
    });
    console.log(`     Norma id: ${normaId.slice(0, 8)}…`);

    await eliminarChunksDeNorma(sb, normaId);
    await insertarChunks(sb, normaId, chunks, embeddings);
    console.log(`     ✓ ${chunks.length} chunks insertados`);
  } catch (err) {
    return { key, chunks: 0, status: `error Supabase: ${(err as Error).message.slice(0, 120)}` };
  }

  // Guardar hash procesado
  ingestState[key] = hashActual;
  writeFileSync(statePath, JSON.stringify(ingestState, null, 2), "utf-8");

  return { key, chunks: chunks.length, status: "OK" };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dry, force, solo, ollama, local } = parsearArgs();

  console.log("\n🚀 Pipeline de ingesta REVISOR ARQ");
  if (dry) console.log("   ⚠  Modo DRY RUN — no se modificará Supabase");
  if (force) console.log("   ⚠  Modo FORCE — reprocesa sin importar cambios");
  if (local) console.log("   ⚠  Modo LOCAL (Transformers.js) — sin APIs externas");
  if (ollama) console.log("   ⚠  Modo OLLAMA — local vía Ollama");

  const manifiesto = loadManifiesto();
  const keys = Object.keys(manifiesto);
  const toProcess = solo ? keys.filter((k) => k === solo) : keys;

  if (!toProcess.length) {
    console.log(solo ? `  ✗ Key "${solo}" no encontrada` : "  ✗ Manifiesto vacío");
    process.exit(1);
  }

  console.log(`\n  Normas a procesar: ${toProcess.length}`);

  const resultados: { key: string; chunks: number; status: string }[] = [];

  for (const key of toProcess) {
    process.stdout.write(`\n→ ${key.padEnd(22)} `);
    const r = await procesarNorma(key, { dry, force, ollama, local });
    console.log(`[${r.status}]${r.chunks ? ` — ${r.chunks} chunks` : ""}`);
    resultados.push(r);

    // Pausa entre normas para no saturar la API de embeddings
    if (!dry && r.status !== "sin cambios (ya procesado)" && toProcess.indexOf(key) < toProcess.length - 1) {
      process.stdout.write(`  (esperando ${BETWEEN_NORMAS_MS / 1000}s...)`)
      await new Promise((r) => setTimeout(r, BETWEEN_NORMAS_MS));
      process.stdout.write(" ✓\n");
    }
  }

  // Resumen
  console.log("\n─────────────────────────────────────────");
  const ok = resultados.filter((r) => ["OK", "dry-run OK"].includes(r.status));
  const sinCambios = resultados.filter((r) => r.status.includes("sin cambios"));
  const errores = resultados.filter(
    (r) => !["OK", "dry-run OK"].includes(r.status) && !r.status.includes("sin cambios")
  );

  console.log(`✓ Procesados:   ${ok.length}`);
  console.log(`  Sin cambios:  ${sinCambios.length}`);
  if (errores.length) {
    console.log(`✗ Con errores:  ${errores.length}`);
    for (const e of errores) console.log(`   - ${e.key}: ${e.status}`);
  }

  const totalChunks = ok.reduce((a, r) => a + r.chunks, 0);
  if (totalChunks > 0) console.log(`\n  Total chunks ${dry ? "estimados" : "insertados"}: ${totalChunks}`);

  if (errores.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n✗ Error fatal:", err);
  process.exit(1);
});
