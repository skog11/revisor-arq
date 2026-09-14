import type { ChunkRecuperado, ModoRespuesta } from "./rag";

export interface NivelConfianza {
  nivel: "alta" | "media" | "baja";
  score: number;         // 0-100
  razon: string;         // Explicacion corta
  color: string;         // CSS variable
  icono: string;         // emoji
}

// --- Calibracion de escalas -------------------------------------------------
//
// OJO: chunk.similarity NO siempre viene en la misma escala.
//   - Si el rerank funciono, retriever.ts sobrescribe similarity con el score
//     de voyage rerank-2 y marca el chunk con rerankeado=true. Distribucion
//     real medida sobre las consultas guardadas en la tabla `consultas`
//     (2026-09): p10=0.605, mediana=0.720, p90=0.805.
//   - Si el rerank fallo (cuota, timeout), queda la similitud coseno de
//     voyage-law-2, que en este corpus vive mucho mas abajo: un match fuerte
//     ronda 0.40 y uno debil 0.25.
//
// Antes ambas escalas entraban a la misma formula lineal, asi que una caida
// del rerank bajaba la confianza de verde a amarillo sin que la calidad de la
// recuperacion hubiera cambiado. Cada escala se normaliza ahora a 0-1 contra
// su propio piso y techo.
const ESCALA_RERANK = { piso: 0.45, techo: 0.75 };
const ESCALA_COSENO = { piso: 0.22, techo: 0.42 };

function normalizar(valor: number, esRerank: boolean): number {
  const { piso, techo } = esRerank ? ESCALA_RERANK : ESCALA_COSENO;
  const n = (valor - piso) / (techo - piso);
  return Math.min(Math.max(n, 0), 1);
}

// Tipos de rango legal o reglamentario superior.
// Incluye DL: los decretos ley son la fuente principal de la materia
// tributaria inmobiliaria (DL 824 renta, DL 825 IVA, DL 3.475 timbres) y
// hasta 2026-09 no sumaban puntos aqui, asi que una respuesta correctamente
// fundada en esas normas quedaba marcada como respaldo parcial.
const TIPOS_ALTA_JERARQUIA = ["LGUC", "OGUC", "LEY", "DFL", "DL"];

export function calcularConfianza(
  chunks: ChunkRecuperado[],
  modo: ModoRespuesta,
  tieneReglasGatillo: boolean,
): NivelConfianza {
  if (chunks.length === 0) {
    return {
      nivel: "baja",
      score: 15,
      razon: "Sin respaldo normativo",
      color: "var(--terracotta)",
      icono: "\u{1F534}"
    };
  }

  // Basta que un chunk venga rerankeado para saber en que escala estamos:
  // el rerank se aplica al lote completo o no se aplica.
  const esRerank = chunks.some((c) => c.rerankeado === true);

  const avgSimilarity = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
  // max y no chunks[0]: anteponerExactos() puede dejar adelante un chunk de
  // referencia exacta con similarity sintetica (1.1), y en el fallback por
  // jerarquia el primero no es necesariamente el de mayor score.
  const topSimilarity = chunks.reduce((m, c) => Math.max(m, c.similarity), 0);

  const topNorm = normalizar(topSimilarity, esRerank);
  const avgNorm = normalizar(avgSimilarity, esRerank);

  const tieneAltaJerarquia = chunks.some((c) =>
    TIPOS_ALTA_JERARQUIA.includes(c.norma_tipo.toUpperCase())
  );
  const numFuentes = new Set(chunks.map((c) => `${c.norma_tipo}-${c.norma_numero}`)).size;

  let score = 0;
  score += topNorm * 35;              // relevancia del mejor fragmento (0-35)
  score += avgNorm * 25;              // relevancia promedio del lote  (0-25)
  score += Math.min(numFuentes * 5, 20); // diversidad de fuentes      (0-20)
  if (tieneAltaJerarquia) score += 10;
  if (tieneReglasGatillo) score += 10;

  score = Math.min(Math.round(score), 100);

  const relevancia = (topNorm * 100).toFixed(0);

  if (score >= 70) {
    return {
      nivel: "alta",
      score,
      razon: `${numFuentes} fuente(s), relevancia ${relevancia}%`,
      color: "var(--ra-green)",
      icono: "\u{1F7E2}"
    };
  }
  if (score >= 40) {
    return {
      nivel: "media",
      score,
      razon: "Respaldo parcial",
      color: "var(--ra-warn)",
      icono: "\u{1F7E1}"
    };
  }
  return {
    nivel: "baja",
    score,
    razon: "Respaldo limitado",
    color: "var(--terracotta)",
    icono: "\u{1F534}"
  };
}