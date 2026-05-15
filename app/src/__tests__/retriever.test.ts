/**
 * retriever.test.ts
 * Tests unitarios para la lógica de routing de búsqueda en retriever.ts.
 *
 * Cobertura de tieneTerminosExactos():
 *   Esta función determina si una consulta activa hybrid search (FTS + vector)
 *   o solo vector search. Una clasificación incorrecta degrada la precisión del RAG.
 *
 *   Verdaderos positivos esperados (debe retornar true):
 *     - Artículos con número ("Art. 116", "artículo 3°", "Artículos 5 y 6")
 *     - Normas con número ("DDU 541", "LGUC DFL-458", "DS-47", "Ley 21.442")
 *     - Números de disposición con ordinal ("N° 10", "Nº 3")
 *
 *   Verdaderos negativos esperados (debe retornar false):
 *     - Preguntas conceptuales sin referencias exactas
 *     - Preguntas con siglas sin número
 */

import { describe, it, expect } from "vitest";
import { tieneTerminosExactos } from "@/lib/retriever";

// ─── Verdaderos positivos ─────────────────────────────────────────────────────

describe("tieneTerminosExactos — referencias que deben activar hybrid search", () => {
  // Artículos
  it("detecta 'artículo 116'", () => {
    expect(tieneTerminosExactos("¿Qué dice el artículo 116 de la LGUC?")).toBe(true);
  });

  it("detecta 'Art. 116' (abreviatura con punto)", () => {
    expect(tieneTerminosExactos("Según Art. 116, ¿se requiere permiso?")).toBe(true);
  });

  it("detecta 'Artículo 5.1.1' (con puntos en número)", () => {
    expect(tieneTerminosExactos("El Artículo 5 de la OGUC establece")).toBe(true);
  });

  it("detecta artículo con ordinal 'artículo 3°'", () => {
    expect(tieneTerminosExactos("Ver artículo 3° del reglamento")).toBe(true);
  });

  it("detecta 'art. 28' en minúsculas", () => {
    expect(tieneTerminosExactos("la art. 28 de la ley")).toBe(true);
  });

  // DDU
  it("detecta 'DDU 541'", () => {
    expect(tieneTerminosExactos("¿Qué instrucciones da la DDU 541?")).toBe(true);
  });

  it("detecta 'DDU-527' (con guión)", () => {
    expect(tieneTerminosExactos("circular DDU-527 del MINVU")).toBe(true);
  });

  it("detecta 'DDU N° 535'", () => {
    expect(tieneTerminosExactos("en la DDU N° 535 se indica")).toBe(true);
  });

  // DS / DFL / DL
  it("detecta 'DS-47'", () => {
    expect(tieneTerminosExactos("El DS-47 establece la OGUC")).toBe(true);
  });

  it("detecta 'DS 61'", () => {
    expect(tieneTerminosExactos("reglamento DS 61 de estructuras")).toBe(true);
  });

  it("detecta 'DFL-458' (DFL con guión)", () => {
    expect(tieneTerminosExactos("aplica el DFL-458")).toBe(true);
  });

  it("detecta 'DFL 382'", () => {
    expect(tieneTerminosExactos("obligaciones del DFL 382 sobre aguas")).toBe(true);
  });

  it("detecta 'DL 3.516'", () => {
    expect(tieneTerminosExactos("según DL 3516 sobre subdivisión")).toBe(true);
  });

  // Leyes
  it("detecta 'Ley 21.442'", () => {
    expect(tieneTerminosExactos("¿Qué dice la Ley 21.442 sobre copropiedad?")).toBe(true);
  });

  it("detecta 'Ley N° 19.300'", () => {
    expect(tieneTerminosExactos("Ley N° 19.300 de bases del medioambiente")).toBe(true);
  });

  // N° / Nº sin sigla normativa (numeraciones de disposición)
  it("detecta 'N° 10' como número de disposición", () => {
    expect(tieneTerminosExactos("ver N° 10 del instructivo")).toBe(true);
  });

  it("detecta 'Nº 3'", () => {
    expect(tieneTerminosExactos("conforme al Nº 3 del artículo")).toBe(true);
  });

  // Resoluciones y Decretos
  it("detecta 'Resolución 1234'", () => {
    expect(tieneTerminosExactos("Resolución 1234 del SEREMI")).toBe(true);
  });

  it("detecta 'Circular 5'", () => {
    expect(tieneTerminosExactos("Circular 5 sobre interpretación")).toBe(true);
  });
});

// ─── Verdaderos negativos ─────────────────────────────────────────────────────

describe("tieneTerminosExactos — consultas conceptuales que NO deben activar hybrid search", () => {
  it("pregunta conceptual sobre subdivisión sin número", () => {
    expect(tieneTerminosExactos("¿Cuáles son los requisitos para subdividir un lote urbano?")).toBe(false);
  });

  it("pregunta sobre rasante sin referencia normativa exacta", () => {
    expect(tieneTerminosExactos("¿Cómo se calcula la rasante en una edificación?")).toBe(false);
  });

  it("pregunta sobre planificación sin número", () => {
    expect(tieneTerminosExactos("¿Qué instrumentos de planificación existen en Chile?")).toBe(false);
  });

  it("sigla sola sin número (LGUC sin número)", () => {
    // "LGUC" sin número no debe activar hybrid search (no hay término exacto que buscar)
    expect(tieneTerminosExactos("¿Qué regula la LGUC?")).toBe(false);
  });

  it("pregunta sobre OGUC sin artículo", () => {
    expect(tieneTerminosExactos("¿Qué regula la OGUC en materia de construcción?")).toBe(false);
  });

  it("consulta sobre copropiedad sin número de ley", () => {
    expect(tieneTerminosExactos("¿Cómo funciona la copropiedad inmobiliaria?")).toBe(false);
  });

  it("pregunta corta sin referencias", () => {
    expect(tieneTerminosExactos("¿qué es el permiso de edificación?")).toBe(false);
  });

  it("texto sin número aunque menciona 'artículo' sin cifra", () => {
    expect(tieneTerminosExactos("¿en qué artículo se explica esto?")).toBe(false);
  });
});
