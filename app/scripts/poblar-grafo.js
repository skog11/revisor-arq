/**
 * poblar-grafo.js — Escanea chunks buscando patrones de relaciones normativas
 * y muestra candidatos para revisión manual.
 *
 * Uso:
 *   node --env-file=.env.local scripts/poblar-grafo.js
 */

import { createClient } from "@supabase/supabase-js";

// ─── Cliente Supabase ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "ERROR: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

// ─── Patrones de detección ────────────────────────────────────────────────────

const PATRONES = [
  { re: /modif(?:ica|ando|ó)\s+(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: "modifica" },
  { re: /deja\s+sin\s+efecto\s+(?:el\s+)?art[íi]culo\s+([\d.]+)/gi, tipo: "deroga" },
  {
    re: /de\s+conformidad\s+(?:con|a)\s+(?:lo\s+)?(?:dispuesto\s+en\s+)?(?:el\s+)?art[íi]culo\s+([\d.]+)/gi,
    tipo: "remite_a",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== POBLAR GRAFO — Detección de relaciones normativas ===\n");

  // Obtener chunks con info de norma
  console.log("Obteniendo chunks (máx. 5000)…");
  const { data: chunks, error } = await sb
    .from("chunks")
    .select("id, texto, fuente, norma_id, normas(tipo, numero, titulo)")
    .limit(5000);

  if (error) {
    console.error("Error al obtener chunks:", error.message);
    process.exit(1);
  }

  if (!chunks || chunks.length === 0) {
    console.log("No se encontraron chunks en la base de datos.");
    return;
  }

  console.log(`Chunks obtenidos: ${chunks.length}\n`);

  // Contar ocurrencias por norma
  const conteosPorNorma = new Map();
  const candidatos = [];

  for (const chunk of chunks) {
    const norma = Array.isArray(chunk.normas) ? chunk.normas[0] : chunk.normas;
    const normaKey = norma
      ? `${norma.tipo} ${norma.numero}`
      : `norma_id:${chunk.norma_id}`;

    const conteoActual = conteosPorNorma.get(normaKey) ?? {
      key: normaKey,
      tipo: norma?.tipo ?? "?",
      numero: norma?.numero ?? "?",
      titulo: norma?.titulo ?? "?",
      total: 0,
      porTipo: {},
    };

    for (const patron of PATRONES) {
      // Resetear lastIndex para cada chunk (flags 'g' o 'gi')
      patron.re.lastIndex = 0;
      let match;
      while ((match = patron.re.exec(chunk.texto)) !== null) {
        conteoActual.total += 1;
        conteoActual.porTipo[patron.tipo] =
          (conteoActual.porTipo[patron.tipo] ?? 0) + 1;

        candidatos.push({
          norma_key: normaKey,
          tipo_relacion: patron.tipo,
          articulo_mencionado: match[1],
          fragmento: chunk.texto.substring(
            Math.max(0, match.index - 60),
            match.index + match[0].length + 60
          ),
        });
      }
    }

    conteosPorNorma.set(normaKey, conteoActual);
  }

  // Top 20 normas con más referencias detectadas
  const top20 = [...conteosPorNorma.values()]
    .filter((n) => n.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  console.log("=== TOP 20 NORMAS CON MÁS REFERENCIAS DETECTADAS ===\n");

  if (top20.length === 0) {
    console.log("No se detectaron patrones de relaciones normativas en los chunks.");
  } else {
    for (const norma of top20) {
      const desglose = Object.entries(norma.porTipo)
        .map(([tipo, cnt]) => `${tipo}: ${cnt}`)
        .join(", ");
      console.log(`[${norma.total} ocurrencias] ${norma.key}`);
      console.log(`  Título: ${norma.titulo}`);
      console.log(`  Desglose: ${desglose}`);
      console.log();
    }
  }

  // Muestra de candidatos (primeros 30)
  if (candidatos.length > 0) {
    console.log(`\n=== MUESTRA DE CANDIDATOS (${Math.min(30, candidatos.length)} de ${candidatos.length}) ===\n`);
    const muestra = candidatos.slice(0, 30);
    for (const c of muestra) {
      console.log(`Norma   : ${c.norma_key}`);
      console.log(`Tipo    : ${c.tipo_relacion}`);
      console.log(`Artículo: ${c.articulo_mencionado}`);
      console.log(`Contexto: …${c.fragmento}…`);
      console.log();
    }
  }

  console.log(
    "─────────────────────────────────────────────────────────────────"
  );
  console.log(
    "Revisar manualmente en Supabase Dashboard y marcar verificado=true las válidas."
  );
  console.log(
    "─────────────────────────────────────────────────────────────────"
  );
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
