import type { ChunkRecuperado, ModoRespuesta } from "./rag";

export interface NivelConfianza {
  nivel: "alta" | "media" | "baja";
  score: number;         // 0-100
  razon: string;         // Explicación corta
  color: string;         // CSS variable
  icono: string;         // emoji
}

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
      icono: "🔴" 
    };
  }

  const avgSimilarity = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
  const topSimilarity = chunks[0]?.similarity ?? 0;
  const tieneAltaJerarquia = chunks.some(c =>
    ["LGUC", "OGUC", "LEY", "DFL"].includes(c.norma_tipo.toUpperCase())
  );
  const numFuentes = new Set(chunks.map(c => `${c.norma_tipo}-${c.norma_numero}`)).size;

  let score = 0;
  // Top similarity (0-35 puntos)
  score += Math.min(topSimilarity * 40, 35);
  // Avg similarity (0-25 puntos)
  score += Math.min(avgSimilarity * 30, 25);
  // Diversidad de fuentes (0-20 puntos)
  score += Math.min(numFuentes * 5, 20);
  // Alta jerarquía (0-10 puntos)
  if (tieneAltaJerarquia) score += 10;
  // Reglas-gatillo activas (bonus: indica match preciso)
  if (tieneReglasGatillo) score += 10;

  score = Math.min(Math.round(score), 100);

  if (score >= 70) {
    return { 
      nivel: "alta", 
      score, 
      razon: `${numFuentes} fuente(s), similitud ${(topSimilarity * 100).toFixed(0)}%`, 
      color: "var(--ra-green)", 
      icono: "🟢" 
    };
  }
  if (score >= 40) {
    return { 
      nivel: "media", 
      score, 
      razon: "Respaldo parcial", 
      color: "var(--ra-warn)", 
      icono: "🟡" 
    };
  }
  return { 
    nivel: "baja", 
    score, 
    razon: "Respaldo limitado", 
    color: "var(--terracotta)", 
    icono: "🔴" 
  };
}
