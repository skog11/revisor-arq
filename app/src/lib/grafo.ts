/**
 * grafo.ts — Módulo de grafo de relaciones entre normas
 * Etapa 4 del pipeline RAG v2: enriquece el contexto consultando norm_relations.
 */

import { getSupabaseServiceClient } from "./supabase";
import type { ChunkRecuperado } from "./rag";

export interface RelacionNorma {
  norma_origen_tipo: string;
  norma_origen_numero: string;
  norma_destino_tipo: string;
  norma_destino_numero: string;
  norma_destino_titulo: string;
  tipo_relacion: string;
  articulos_afectados: string[];
  descripcion: string | null;
}

// Forma que devuelve Supabase al hacer join anidado
interface NormaJoin {
  id: string;
  tipo: string;
  numero: string;
  titulo: string;
}

// Supabase devuelve joins many-to-one (FK en esta tabla → PK en la otra) como objeto único.
// Se tipan como union para ser defensivos ante diferencias de versión del cliente.
interface RelacionRow {
  tipo_relacion: string;
  articulos_afectados: string[] | null;
  descripcion: string | null;
  norma_origen: NormaJoin | NormaJoin[] | null;
  norma_destino: NormaJoin | NormaJoin[] | null;
}

/** Normaliza el resultado de un FK join (puede ser objeto o array) */
function primerItem(v: NormaJoin | NormaJoin[] | null | undefined): NormaJoin | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function obtenerRelacionesNormativas(
  chunks: ChunkRecuperado[]
): Promise<RelacionNorma[]> {
  if (chunks.length === 0) return [];

  const sb = getSupabaseServiceClient();

  // Extraer pares únicos (tipo, numero) presentes en los chunks
  const tiposPresentes = [...new Set(chunks.map((c) => c.norma_tipo).filter(Boolean))];
  const numerosPresentes = [...new Set(chunks.map((c) => c.norma_numero).filter(Boolean))];

  if (tiposPresentes.length === 0 || numerosPresentes.length === 0) return [];

  // Obtener los UUIDs de las normas presentes
  const { data: normasPresentes } = await sb
    .from("normas")
    .select("id, tipo, numero")
    .in("tipo", tiposPresentes)
    .in("numero", numerosPresentes);

  if (!normasPresentes || normasPresentes.length === 0) return [];

  const idsPresentes = normasPresentes.map((n: { id: string }) => n.id);

  // Consultar relaciones donde alguna de las normas presentes sea origen o destino.
  // `.or()` con sintaxis `.in.()` es PostgREST válido y soportado por el cliente JS v2.
  const { data: relaciones, error: relError } = await sb
    .from("norm_relations")
    .select(`
      tipo_relacion,
      articulos_afectados,
      descripcion,
      norma_origen:norma_origen(id, tipo, numero, titulo),
      norma_destino:norma_destino(id, tipo, numero, titulo)
    `)
    .or(`norma_origen.in.(${idsPresentes.join(",")}),norma_destino.in.(${idsPresentes.join(",")})`)
    .eq("verificado", true)
    .limit(20);

  if (relError) {
    console.error("[grafo] Error al consultar norm_relations:", relError.message);
    return [];
  }
  if (!relaciones || relaciones.length === 0) return [];

  return (relaciones as unknown as RelacionRow[])
    .filter((r) => primerItem(r.norma_origen) && primerItem(r.norma_destino))
    .map((r) => {
      const origen = primerItem(r.norma_origen)!;
      const destino = primerItem(r.norma_destino)!;
      return {
        norma_origen_tipo: origen.tipo,
        norma_origen_numero: origen.numero,
        norma_destino_tipo: destino.tipo,
        norma_destino_numero: destino.numero,
        norma_destino_titulo: destino.titulo,
        tipo_relacion: r.tipo_relacion,
        articulos_afectados: r.articulos_afectados ?? [],
        descripcion: r.descripcion,
      };
    });
}

export function formatearRelaciones(relaciones: RelacionNorma[]): string {
  if (relaciones.length === 0) return "";

  const lineas = relaciones.map((r) => {
    const arts =
      r.articulos_afectados.length > 0
        ? ` (afecta Arts. ${r.articulos_afectados.join(", ")})`
        : "";
    const desc = r.descripcion ? `: ${r.descripcion}` : "";
    return `- ${r.norma_origen_tipo} ${r.norma_origen_numero} → [${r.tipo_relacion}] → ${r.norma_destino_tipo} ${r.norma_destino_numero}${arts}${desc}`;
  });

  return `\nRELACIONES NORMATIVAS DETECTADAS EN EL GRAFO:\n${lineas.join("\n")}`;
}
