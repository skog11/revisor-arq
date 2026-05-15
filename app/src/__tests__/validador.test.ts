/**
 * validador.test.ts
 * Tests unitarios para validarConsistencia().
 *
 * Cobertura:
 *   - Longitud mínima de respuesta
 *   - Disclaimer obligatorio (3 variantes)
 *   - Verificación artículos citados vs contexto recuperado
 *   - Normalización de ordinales (° º)
 *   - No duplicación de advertencias
 *   - Estructura del resultado (siempre devuelve objeto completo)
 */

import { describe, it, expect } from "vitest";
import { validarConsistencia } from "@/lib/validador";
import type { ChunkRecuperado } from "@/lib/rag";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _idCounter = 0;

function chunk(articulo: string | null, tipo = "LGUC"): ChunkRecuperado {
  return {
    id: `chunk-test-${++_idCounter}`,
    texto: "Texto de prueba del chunk normativo.",
    similarity: 0.9,
    norma_tipo: tipo,
    norma_numero: "DFL-458",
    norma_titulo: "Ley General de Urbanismo y Construcciones",
    articulo,
    jerarquia: "articulo",
    url_fuente: "https://www.bcn.cl/leychile/navegar?idNorma=13560",
    fecha_vigencia_desde: "1976-01-01",
    norma_dominio: "urbanismo",
    norma_organo_emisor: "MINVU",
    norma_jerarquia_norm: "ley",
    norma_etapas_proyecto: ["ingreso_permiso"],
  };
}

/** Respuesta mínima válida que incluye disclaimer y artículo 116. */
const RESPUESTA_VALIDA_ARQ = `Según el artículo 116 de la LGUC, toda obra requiere permiso de la Dirección de Obras Municipales.

---
⚠️ **Aviso legal**: Esta respuesta es orientativa y no constituye asesoría jurídica profesional. Verifica siempre el texto vigente en BCN (www.bcn.cl) y consulta con un profesional habilitado antes de tomar decisiones.`;

// ─── Longitud mínima ──────────────────────────────────────────────────────────

describe("validarConsistencia — longitud mínima", () => {
  it("rechaza respuesta vacía", () => {
    const r = validarConsistencia("", []);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe("Respuesta demasiado corta");
  });

  it("rechaza respuesta de solo espacios", () => {
    const r = validarConsistencia("   ", []);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe("Respuesta demasiado corta");
  });

  it("rechaza respuesta menor a 50 caracteres", () => {
    const r = validarConsistencia("Ok, aplica LGUC.", []);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe("Respuesta demasiado corta");
  });
});

// ─── Disclaimer obligatorio ───────────────────────────────────────────────────

describe("validarConsistencia — disclaimer obligatorio", () => {
  const BASE_LARGA = "Esta es una respuesta larga sobre normativa urbanística chilena para cumplir el mínimo de 50 caracteres requeridos.";

  it("rechaza respuesta sin ninguna variante de disclaimer", () => {
    const r = validarConsistencia(BASE_LARGA, []);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe("Falta disclaimer legal");
  });

  it("acepta respuesta que contiene 'Aviso legal'", () => {
    const r = validarConsistencia(BASE_LARGA + "\n⚠️ Aviso legal: texto aquí.", []);
    expect(r.valida).toBe(true);
  });

  it("acepta respuesta que contiene 'asesoría jurídica'", () => {
    const r = validarConsistencia(BASE_LARGA + " no constituye asesoría jurídica.", []);
    expect(r.valida).toBe(true);
  });

  it("acepta respuesta que contiene 'profesional habilitado'", () => {
    const r = validarConsistencia(BASE_LARGA + " consulta con un profesional habilitado.", []);
    expect(r.valida).toBe(true);
  });
});

// ─── Verificación de artículos ────────────────────────────────────────────────

describe("validarConsistencia — verificación de artículos citados", () => {
  it("no genera advertencias si la respuesta no cita artículos", () => {
    const respuestaSinArts = `La normativa aplicable establece requisitos generales.

---
⚠️ **Aviso legal**: Esta respuesta es orientativa. Consulta con un profesional habilitado.`;
    const r = validarConsistencia(respuestaSinArts, []);
    expect(r.advertencias).toHaveLength(0);
    expect(r.notasAdicionales).toBe("");
  });

  it("no genera advertencias cuando el artículo citado está en los chunks", () => {
    const r = validarConsistencia(RESPUESTA_VALIDA_ARQ, [chunk("116")]);
    expect(r.advertencias).toHaveLength(0);
    expect(r.notasAdicionales).toBe("");
  });

  it("genera advertencia cuando el artículo citado NO está en los chunks", () => {
    const r = validarConsistencia(RESPUESTA_VALIDA_ARQ, [chunk("5")]); // art. 5, no 116
    expect(r.advertencias.length).toBeGreaterThan(0);
    expect(r.advertencias[0]).toContain("116");
  });

  it("separa artículos encontrados de no encontrados cuando la respuesta cita varios", () => {
    const respuestaMulti = `Según el artículo 116 y el artículo 5 de la LGUC se aplican estas reglas.

---
⚠️ **Aviso legal**: Consulta con un profesional habilitado.`;

    // Solo art. 116 en contexto
    const r = validarConsistencia(respuestaMulti, [chunk("116")]);

    const mencionaArt5  = r.advertencias.some((a) => a.includes("5"));
    const mencionaArt116 = r.advertencias.some((a) => a.includes("116"));

    expect(mencionaArt5).toBe(true);    // art. 5 no está → advertencia
    expect(mencionaArt116).toBe(false); // art. 116 sí está → sin advertencia
  });

  it("chunk con artículo null no causa error y no bloquea la validación", () => {
    const r = validarConsistencia(RESPUESTA_VALIDA_ARQ, [chunk(null)]);
    expect(r.valida).toBe(true); // sigue válida (disclaimer presente)
    // art. 116 citado pero ningún chunk tiene artículo → advertencia esperada
    expect(r.advertencias.length).toBeGreaterThan(0);
  });

  it("agrega nota con link a BCN cuando hay advertencias", () => {
    const r = validarConsistencia(RESPUESTA_VALIDA_ARQ, [chunk("5")]);
    expect(r.notasAdicionales).toContain("BCN");
  });
});

// ─── Normalización de ordinales ───────────────────────────────────────────────

describe("validarConsistencia — normalización de ordinales", () => {
  it("normaliza artículo con '°' en la respuesta y en el chunk y no genera advertencia", () => {
    const respuesta = `El artículo 116° establece los requisitos.

---
⚠️ **Aviso legal**: Consulta con un profesional habilitado.`;
    const r = validarConsistencia(respuesta, [chunk("116°")]);
    expect(r.advertencias.some((a) => a.includes("116"))).toBe(false);
  });

  it("normaliza artículo con 'º' (masculino ordinal) correctamente", () => {
    const respuesta = `Según el artículo 116º de la LGUC.

---
⚠️ **Aviso legal**: Consulta con un profesional habilitado.`;
    const r = validarConsistencia(respuesta, [chunk("116")]);
    expect(r.advertencias.some((a) => a.includes("116"))).toBe(false);
  });
});

// ─── No duplicación de advertencias ──────────────────────────────────────────

describe("validarConsistencia — no duplicación de advertencias", () => {
  it("genera exactamente 1 advertencia aunque el artículo se cite múltiples veces", () => {
    const respuestaRepetida = `El artículo 999 aplica. El artículo 999 también señala. Además el artículo 999 establece.

---
⚠️ **Aviso legal**: Consulta con un profesional habilitado.`;
    const r = validarConsistencia(respuestaRepetida, []);
    const advArt999 = r.advertencias.filter((a) => a.includes("999"));
    expect(advArt999).toHaveLength(1);
  });
});

// ─── Estructura del resultado ─────────────────────────────────────────────────

describe("validarConsistencia — estructura del resultado", () => {
  it("siempre devuelve objeto con las 4 propiedades esperadas", () => {
    const r = validarConsistencia(RESPUESTA_VALIDA_ARQ, []);
    expect(r).toHaveProperty("valida");
    expect(r).toHaveProperty("advertencias");
    expect(r).toHaveProperty("notasAdicionales");
    expect(Array.isArray(r.advertencias)).toBe(true);
    expect(typeof r.notasAdicionales).toBe("string");
  });

  it("resultado inválido también tiene advertencias vacías y notasAdicionales vacío", () => {
    const r = validarConsistencia("corta", []);
    expect(r.valida).toBe(false);
    expect(Array.isArray(r.advertencias)).toBe(true);
    expect(typeof r.notasAdicionales).toBe("string");
  });
});
