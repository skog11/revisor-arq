/**
 * detectar-referencias.ts
 *
 * Detecta automáticamente referencias cruzadas entre normas en los chunks
 * ya almacenados en Supabase y las guarda en la tabla `norm_relations`.
 *
 * Uso:
 *   tsx --env-file=.env.local scripts/ingest/detectar-referencias.ts
 *
 * Estrategia:
 *   1. Obtiene todos los chunks (id, texto, norma_id, metadatos) en lotes de 100.
 *   2. Para cada chunk, aplica regex sobre el texto para detectar menciones a normas.
 *   3. Busca en la tabla `normas` si existe la norma referenciada.
 *   4. Si existe y es distinta a la norma de origen, inserta en `norm_relations`
 *      con tipo_relacion = 'remite_a' y verificado = false.
 *   5. Usa ON CONFLICT DO NOTHING para no duplicar relaciones.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Supabase ──────────────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) " +
        "y/o SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_KEY)"
    );
  }
  return createClient(url, key);
}

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface ChunkRow {
  id: string;
  norma_id: string;
  texto: string;
  metadatos: {
    tipo_norma?: string;
    numero_norma?: string;
    articulo?: string | null;
    [key: string]: unknown;
  } | null;
}

interface NormaRow {
  id: string;
  tipo: string;
  numero: string;
}

/** Una referencia cruzada detectada en el texto de un chunk */
interface ReferenciaDetectada {
  tipo: string;   // "LGUC" | "OGUC" | "DDU" | "DS" | "DFL" | "DL" | "LEY" | "Ley"
  numero: string; // ej. "19300", "47", "227"
  articulo: string | null; // artículo del chunk donde se encontró, si disponible
}

// ─── Regex de detección ────────────────────────────────────────────────────────

/**
 * Detecta menciones del tipo:
 *   - "LGUC", "OGUC"
 *   - "DDU N° 227", "DDU-350"
 *   - "DS 47", "DS N°47", "DS-47"
 *   - "DFL 2", "DL 2695"
 *   - "LEY N° 19.300", "Ley 20.422"
 */
const REGEX_NORMA =
  /(LGUC|OGUC|DDU|DS|DFL|DL|LEY|Ley)\s*[-–]?\s*N[°o]?\s*(\d[\d.]*[\w]*)/gi;

/**
 * Detecta "Ley N° 19.300" con el formato más formal (números con puntos)
 */
const REGEX_LEY_FORMAL = /Ley\s+N[°o]\s*([\d.]+)/gi;

// ─── Normalización ─────────────────────────────────────────────────────────────

/**
 * Normaliza el tipo de norma al enum que usa la tabla `normas`.
 * Retorna null si el tipo no es reconocible.
 */
function normalizarTipo(raw: string): string | null {
  const upper = raw.toUpperCase().trim();
  if (upper === "LGUC") return "LGUC";
  if (upper === "OGUC") return "OGUC";
  if (upper === "DDU") return "DDU";
  if (upper === "DS") return "DS";
  if (upper === "DFL") return "DFL";
  if (upper === "DL") return "DL";
  if (upper === "LEY") return "LEY";
  return null;
}

/**
 * Normaliza un número de norma eliminando puntos de miles y ceros a la
 * izquierda, para mejorar el matching aproximado contra la BD.
 * Ej: "19.300" → "19300", "047" → "47"
 */
function normalizarNumero(raw: string): string {
  return raw.replace(/\./g, "").replace(/^0+/, "") || raw;
}

/**
 * Extrae referencias cruzadas del texto de un chunk.
 * Deduplicadas por (tipo, numero).
 */
function detectarReferencias(
  texto: string,
  articuloChunk: string | null
): ReferenciaDetectada[] {
  const encontradas = new Map<string, ReferenciaDetectada>();

  // Regex principal: LGUC, OGUC, DDU, DS, DFL, DL, LEY/Ley seguido de número
  const reNorma = new RegExp(REGEX_NORMA.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = reNorma.exec(texto)) !== null) {
    const tipo = normalizarTipo(m[1]);
    if (!tipo) continue;
    const numero = normalizarNumero(m[2]);
    const key = `${tipo}:${numero}`;
    if (!encontradas.has(key)) {
      encontradas.set(key, { tipo, numero, articulo: articuloChunk });
    }
  }

  // Regex formal para Ley (sin solapamiento con el anterior)
  const reLey = new RegExp(REGEX_LEY_FORMAL.source, "gi");
  while ((m = reLey.exec(texto)) !== null) {
    const numero = normalizarNumero(m[1]);
    const key = `LEY:${numero}`;
    if (!encontradas.has(key)) {
      encontradas.set(key, {
        tipo: "LEY",
        numero,
        articulo: articuloChunk,
      });
    }
  }

  return [...encontradas.values()];
}

// ─── Búsqueda de norma en BD ───────────────────────────────────────────────────

/**
 * Busca una norma en `normas` por tipo y número (aproximado).
 * Primero intenta match exacto; si no, busca con ILIKE para números con variantes
 * (ej. "19300" puede estar como "19.300" en la BD).
 * Retorna el UUID o null.
 */
async function buscarNormaDestino(
  sb: SupabaseClient,
  tipo: string,
  numero: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  const cacheKey = `${tipo}:${numero}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // Intento 1: match exacto
  const { data: exacta } = await sb
    .from("normas")
    .select("id")
    .eq("tipo", tipo)
    .eq("numero", numero)
    .maybeSingle();

  if (exacta?.id) {
    cache.set(cacheKey, exacta.id as string);
    return exacta.id as string;
  }

  // Intento 2: LGUC y OGUC no tienen número significativo — match solo por tipo
  if (tipo === "LGUC" || tipo === "OGUC") {
    const { data: porTipo } = await sb
      .from("normas")
      .select("id")
      .eq("tipo", tipo)
      .limit(1)
      .maybeSingle();
    const id = porTipo?.id ?? null;
    cache.set(cacheKey, id as string | null);
    return id as string | null;
  }

  // Intento 3: ILIKE con el número normalizado (cubre "19.300" vs "19300")
  const { data: aproximada } = await sb
    .from("normas")
    .select("id, numero")
    .eq("tipo", tipo)
    .ilike("numero", `%${numero}%`)
    .limit(1)
    .maybeSingle();

  const id = (aproximada as NormaRow | null)?.id ?? null;
  cache.set(cacheKey, id);
  return id;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nDetector de referencias cruzadas — REVISOR ARQ");
  console.log("─────────────────────────────────────────────────\n");

  const sb = getSupabaseClient();

  // Contadores globales
  let totalChunks = 0;
  let totalReferenciasDetectadas = 0;
  let totalInsertadas = 0;
  let totalYaExistian = 0;
  let totalErrores = 0;

  // Cache (tipo:numero) → UUID | null para evitar consultas repetidas a normas
  const cacheNormas = new Map<string, string | null>();

  // Procesar chunks en lotes de 100
  const BATCH_SIZE = 100;
  let offset = 0;
  let hayMas = true;

  while (hayMas) {
    const { data: chunks, error: errChunks } = await sb
      .from("chunks")
      .select("id, norma_id, texto, metadatos")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("id");

    if (errChunks) {
      console.error(`Error obteniendo chunks (offset ${offset}):`, errChunks.message);
      break;
    }

    if (!chunks || chunks.length === 0) {
      hayMas = false;
      break;
    }

    totalChunks += chunks.length;
    process.stdout.write(
      `  Procesando chunks ${offset + 1}–${offset + chunks.length}...`
    );

    for (const chunk of chunks as ChunkRow[]) {
      try {
        const articuloChunk = chunk.metadatos?.articulo ?? null;
        const referencias = detectarReferencias(chunk.texto, articuloChunk);

        for (const ref of referencias) {
          totalReferenciasDetectadas++;

          // Buscar UUID destino
          const destinoId = await buscarNormaDestino(
            sb,
            ref.tipo,
            ref.numero,
            cacheNormas
          );

          if (!destinoId) continue; // norma no existe en el corpus
          if (destinoId === chunk.norma_id) continue; // autoreferencia — ignorar

          // Intentar insertar en norm_relations
          const { error: errInsert, status } = await sb
            .from("norm_relations")
            .insert({
              norma_origen: chunk.norma_id,
              norma_destino: destinoId,
              tipo_relacion: "remite_a",
              articulos_afectados: ref.articulo ? [ref.articulo] : [],
              verificado: false,
            })
            .select("id");

          if (errInsert) {
            // 23505 = unique_violation → relación ya existía (ON CONFLICT no disponible vía JS insert)
            if (
              errInsert.code === "23505" ||
              errInsert.message?.includes("duplicate") ||
              errInsert.message?.includes("unique")
            ) {
              totalYaExistian++;
            } else {
              // Error real — registrar pero seguir
              console.warn(
                `\n  [!] Error insertando relacion (chunk ${chunk.id.slice(0, 8)}): ${errInsert.message}`
              );
              totalErrores++;
            }
          } else {
            totalInsertadas++;
          }
        }
      } catch (err) {
        // Error por chunk — no detiene el procesamiento
        console.warn(
          `\n  [!] Error procesando chunk ${chunk.id.slice(0, 8)}: ${(err as Error).message}`
        );
        totalErrores++;
      }
    }

    console.log(" OK");

    if (chunks.length < BATCH_SIZE) {
      hayMas = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  // ─── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────");
  console.log(`Chunks procesados:          ${totalChunks}`);
  console.log(`Referencias detectadas:     ${totalReferenciasDetectadas}`);
  console.log(`Relaciones insertadas:      ${totalInsertadas}`);
  console.log(`Ya existian (duplicadas):   ${totalYaExistian}`);
  if (totalErrores > 0) {
    console.log(`Errores:                    ${totalErrores}`);
  }
  console.log("\nListo.");
}

main().catch((err) => {
  console.error("\nError fatal:", err);
  process.exit(1);
});
