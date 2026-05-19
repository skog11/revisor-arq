/**
 * fetcher-normas-obligatorias.ts — Recupera chunks de normas específicas por clave.
 *
 * Cuando el motor de reglas detecta que una norma (ej. DDU-161) debe estar en el
 * paquete de evidencia, este módulo trae los mejores chunks de esa norma para
 * inyectarlos junto al retrieval semántico estándar.
 */

import { getSupabaseServiceClient } from "./supabase";
import type { ChunkRecuperado } from "./rag";

/**
 * Dado un conjunto de claves de norma (formato "TIPO-NUMERO", ej. "DDU-161"),
 * recupera los primeros N chunks de cada una y los devuelve como ChunkRecuperado.
 *
 * Si no encuentra una norma, simplemente la omite (silencioso). Si una clave es
 * solo "LGUC" o "OGUC", trae los primeros chunks de esa norma sin filtrar.
 *
 * @param claves   Array de claves como ["DDU-161", "LGUC"]
 * @param porNorma Cuántos chunks traer por cada norma (default 3)
 */
export async function fetchChunksObligatorios(
  claves: string[],
  porNorma = 3
): Promise<ChunkRecuperado[]> {
  if (claves.length === 0) return [];

  const sb = getSupabaseServiceClient();
  const resultados: ChunkRecuperado[] = [];

  for (const clave of claves) {
    const [tipo, ...numeroParts] = clave.split("-");
    const numero = numeroParts.join("-");

    let query = sb
      .from("normas")
      .select("id, tipo, numero, titulo, url_fuente, fecha_vigencia_desde, dominio, organo_emisor, jerarquia_norm, etapas_proyecto")
      .eq("tipo", tipo)
      .limit(1);

    if (numero) {
      query = query.eq("numero", numero);
    }

    const { data: normaData, error: normaErr } = await query;
    if (normaErr || !normaData || normaData.length === 0) {
      // Norma no encontrada por tipo+numero. Si solo se pidió "LGUC" u "OGUC", podría
      // estar registrada como "LGUC-DFL-458" — buscar por tipo solo, tomar el primero.
      if (!numero) {
        const { data: fallback } = await sb
          .from("normas")
          .select("id, tipo, numero, titulo, url_fuente, fecha_vigencia_desde, dominio, organo_emisor, jerarquia_norm, etapas_proyecto")
          .eq("tipo", tipo)
          .limit(1);
        if (!fallback || fallback.length === 0) continue;
        normaData?.push(...fallback);
      } else {
        continue;
      }
    }

    const norma = normaData![0];

    // Recuperar los primeros N chunks por orden
    const { data: chunks, error: chunksErr } = await sb
      .from("chunks")
      .select("id, texto, tokens, orden, metadatos")
      .eq("norma_id", norma.id)
      .order("orden", { ascending: true })
      .limit(porNorma);

    if (chunksErr || !chunks) continue;

    for (const c of chunks) {
      const meta = (c.metadatos as Record<string, unknown>) ?? {};
      resultados.push({
        id: c.id as string,
        texto: c.texto as string,
        similarity: 1.0, // similarity ficticia — chunk forzado por regla
        norma_tipo: norma.tipo as string,
        norma_numero: norma.numero as string,
        norma_titulo: norma.titulo as string,
        articulo: (meta.articulo as string | null) ?? null,
        jerarquia: (meta.jerarquia as string | null) ?? null,
        url_fuente: norma.url_fuente as string,
        fecha_vigencia_desde: norma.fecha_vigencia_desde as string | null,
        norma_dominio: (norma.dominio as string | null) ?? null,
        norma_organo_emisor: (norma.organo_emisor as string | null) ?? null,
        norma_jerarquia_norm: (norma.jerarquia_norm as string | null) ?? null,
        norma_etapas_proyecto: (norma.etapas_proyecto as string[] | null) ?? [],
      });
    }
  }

  return resultados;
}

/**
 * Mergea chunks obligatorios con chunks recuperados por similarity, eliminando
 * duplicados (mismo id) y poniendo los obligatorios al inicio.
 */
export function mergearChunks(
  obligatorios: ChunkRecuperado[],
  recuperados: ChunkRecuperado[]
): ChunkRecuperado[] {
  const idsObligatorios = new Set(obligatorios.map((c) => c.id));
  const resto = recuperados.filter((c) => !idsObligatorios.has(c.id));
  return [...obligatorios, ...resto];
}
