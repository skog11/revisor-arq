/**
 * cerebro-v1.test.ts
 *
 * Cubre los ajustes de calidad de recuperacion y confianza de 2026-09:
 *   - seleccionarConCuota(): cuota minima de normas de alta jerarquia en la
 *     ventana final, para que el rerank no llene los 18 cupos con circulares.
 *   - calcularConfianza(): las dos escalas de `similarity` (rerank vs coseno)
 *     se normalizan por separado, y DL cuenta como alta jerarquia.
 */

import { describe, it, expect } from "vitest";
import { seleccionarConCuota } from "@/lib/retriever";
import { calcularConfianza } from "@/lib/confianza";
import type { ChunkRecuperado } from "@/lib/rag";

function chunk(
  id: string,
  tipo: string,
  similarity: number,
  extra: Partial<ChunkRecuperado> = {}
): ChunkRecuperado {
  return {
    id,
    texto: `texto de ${id}`,
    similarity,
    norma_tipo: tipo,
    norma_numero: id,
    norma_titulo: `titulo ${id}`,
    articulo: null,
    jerarquia: null,
    url_fuente: "",
    fecha_vigencia_desde: null,
    norma_dominio: null,
    norma_organo_emisor: null,
    norma_jerarquia_norm: null,
    norma_etapas_proyecto: [],
    ...extra,
  };
}

describe("seleccionarConCuota", () => {
  it("promueve normas de alta jerarquia cuando el top esta copado por DDU", () => {
    const ordenados = [
      ...Array.from({ length: 10 }, (_, i) => chunk(`ddu${i}`, "DDU", 0.8 - i * 0.01)),
      chunk("ley1", "LEY", 0.60),
      chunk("ley2", "LEY", 0.59),
      chunk("dl1", "DL", 0.58),
    ];

    const sel = seleccionarConCuota(ordenados, 6, 3);

    expect(sel).toHaveLength(6);
    const altas = sel.filter((c) => ["LEY", "DL"].includes(c.norma_tipo));
    expect(altas).toHaveLength(3);
    expect(sel.map((c) => c.id)).toEqual(expect.arrayContaining(["ley1", "ley2", "dl1"]));
  });

  it("conserva el orden por relevancia tras promover", () => {
    const ordenados = [
      chunk("ddu0", "DDU", 0.9),
      chunk("ddu1", "DDU", 0.8),
      chunk("ddu2", "DDU", 0.7),
      chunk("ley1", "LEY", 0.6),
    ];
    const sel = seleccionarConCuota(ordenados, 3, 1);
    const posiciones = sel.map((c) => ordenados.findIndex((o) => o.id === c.id));
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
  });

  it("no altera la seleccion si la cuota ya se cumple", () => {
    const ordenados = [
      chunk("ley1", "LEY", 0.9),
      chunk("oguc1", "OGUC", 0.8),
      chunk("ddu0", "DDU", 0.7),
      chunk("ddu1", "DDU", 0.6),
    ];
    const sel = seleccionarConCuota(ordenados, 3, 2);
    expect(sel.map((c) => c.id)).toEqual(["ley1", "oguc1", "ddu0"]);
  });

  it("no inventa resultados cuando no hay alta jerarquia disponible", () => {
    const ordenados = Array.from({ length: 5 }, (_, i) =>
      chunk(`ddu${i}`, "DDU", 0.9 - i * 0.1)
    );
    const sel = seleccionarConCuota(ordenados, 3, 2);
    expect(sel.map((c) => c.id)).toEqual(["ddu0", "ddu1", "ddu2"]);
  });

  it("devuelve la lista completa si cabe entera", () => {
    const ordenados = [chunk("a", "DDU", 0.5), chunk("b", "DDU", 0.4)];
    expect(seleccionarConCuota(ordenados, 18, 5)).toHaveLength(2);
  });
});

describe("calcularConfianza - escalas de similarity", () => {
  it("no castiga al lote cuando el rerank fallo y quedan similitudes coseno", () => {
    // Mismo conjunto de fuentes, misma calidad de recuperacion. La unica
    // diferencia es la escala: antes esto bajaba la confianza de alta a media.
    const conRerank = [
      chunk("ley1", "LEY", 0.72, { rerankeado: true }),
      chunk("ley2", "LEY", 0.70, { rerankeado: true, norma_numero: "20780" }),
      chunk("oguc", "OGUC", 0.68, { rerankeado: true }),
      chunk("ddu", "DDU", 0.66, { rerankeado: true }),
    ];
    const sinRerank = [
      chunk("ley1", "LEY", 0.39),
      chunk("ley2", "LEY", 0.37, { norma_numero: "20780" }),
      chunk("oguc", "OGUC", 0.35),
      chunk("ddu", "DDU", 0.34),
    ];

    const a = calcularConfianza(conRerank, "arquitecto", false);
    const b = calcularConfianza(sinRerank, "arquitecto", false);

    expect(a.nivel).toBe("alta");
    expect(b.nivel).toBe("alta");
    expect(Math.abs(a.score - b.score)).toBeLessThanOrEqual(10);
  });

  it("cuenta DL como alta jerarquia", () => {
    const soloDL = [
      chunk("dl824", "DL", 0.70, { rerankeado: true }),
      chunk("dl825", "DL", 0.68, { rerankeado: true, norma_numero: "825" }),
    ];
    const soloDDU = [
      chunk("ddu1", "DDU", 0.70, { rerankeado: true }),
      chunk("ddu2", "DDU", 0.68, { rerankeado: true, norma_numero: "543" }),
    ];
    expect(calcularConfianza(soloDL, "arquitecto", false).score)
      .toBeGreaterThan(calcularConfianza(soloDDU, "arquitecto", false).score);
  });

  it("marca respaldo bajo cuando no hay chunks", () => {
    expect(calcularConfianza([], "arquitecto", false).nivel).toBe("baja");
  });
});