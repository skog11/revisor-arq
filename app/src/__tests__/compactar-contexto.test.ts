/**
 * compactar-contexto.test.ts
 * Cubre el recorte del bloque de fuentes que se envía a proveedores con
 * presupuesto de tokens chico (Groq free: 8.000 TPM).
 */

import { describe, it, expect } from "vitest";
import { compactarPrompt } from "@/lib/compactar-contexto";
import { construirContexto } from "@/lib/rag";
import type { ChunkRecuperado } from "@/lib/rag";

function chunk(i: number, texto: string): ChunkRecuperado {
  return {
    id: `chunk-${i}`,
    texto,
    similarity: 0.9,
    norma_tipo: "OGUC",
    norma_numero: "DS-47",
    norma_titulo: "Ordenanza General de Urbanismo y Construcciones",
    articulo: `1.1.${i}`,
    jerarquia: "articulo",
    url_fuente: "https://www.bcn.cl",
    fecha_vigencia_desde: "1992-05-05",
    norma_dominio: "urbanismo",
    norma_organo_emisor: "MINVU",
    norma_jerarquia_norm: "reglamento",
    norma_etapas_proyecto: [],
  };
}

/** Prompt con la misma forma que arma el sintetizador: instrucciones + fuentes + cierre. */
function promptCon(cantidadFuentes: number, largoTexto = 100): string {
  const chunks = Array.from({ length: cantidadFuentes }, (_, i) =>
    chunk(i + 1, `Texto de la fuente ${i + 1}. `.repeat(Math.ceil(largoTexto / 24)).slice(0, largoTexto))
  );
  const { textoContexto } = construirContexto(chunks);
  return [
    "Eres un asistente normativo. Cita siempre el artículo.",
    "",
    "## CONTEXTO NORMATIVO",
    textoContexto,
    "",
    "## INSTRUCCIONES FINALES",
    "Incluye siempre el aviso legal al pie.",
  ].join("\n");
}

describe("compactarPrompt", () => {
  it("conserva solo las primeras fuentes y descarta el resto", () => {
    const prompt = promptCon(18);
    const compacto = compactarPrompt(prompt, { maxFuentes: 6, maxCaracteresPorFuente: 1500 });

    expect(compacto).toContain("FUENTE [1]");
    expect(compacto).toContain("FUENTE [6]");
    expect(compacto).not.toContain("FUENTE [7]");
    expect(compacto).not.toContain("FUENTE [18]");
  });

  it("mantiene las instrucciones anteriores y posteriores al bloque de fuentes", () => {
    const prompt = promptCon(18);
    const compacto = compactarPrompt(prompt, { maxFuentes: 6, maxCaracteresPorFuente: 1500 });

    expect(compacto).toContain("Eres un asistente normativo");
    expect(compacto).toContain("## INSTRUCCIONES FINALES");
    expect(compacto).toContain("Incluye siempre el aviso legal al pie.");
  });

  it("trunca el texto de cada fuente que supera el tope", () => {
    const prompt = promptCon(3, 4000);
    const compacto = compactarPrompt(prompt, { maxFuentes: 3, maxCaracteresPorFuente: 500 });

    expect(compacto).toContain("texto truncado por límite del proveedor");
    expect(compacto.length).toBeLessThan(prompt.length / 2);
  });

  it("reduce sustancialmente el tamaño de un prompt de 18 fuentes largas", () => {
    const prompt = promptCon(18, 2000);
    const compacto = compactarPrompt(prompt, { maxFuentes: 6, maxCaracteresPorFuente: 1500 });

    expect(compacto.length).toBeLessThan(prompt.length * 0.4);
  });

  it("no altera un prompt sin bloques de fuente", () => {
    const prompt = "Instrucciones sin contexto recuperado.";
    expect(compactarPrompt(prompt, { maxFuentes: 6, maxCaracteresPorFuente: 1500 })).toBe(prompt);
  });

  it("deja intacto un prompt que ya tiene menos fuentes que el tope", () => {
    const prompt = promptCon(3, 80);
    const compacto = compactarPrompt(prompt, { maxFuentes: 6, maxCaracteresPorFuente: 1500 });

    expect(compacto).toContain("FUENTE [3]");
    expect(compacto).toContain("## INSTRUCCIONES FINALES");
    expect(compacto).not.toContain("texto truncado");
  });
});
