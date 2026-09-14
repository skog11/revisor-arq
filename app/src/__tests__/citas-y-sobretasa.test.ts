/**
 * citas-y-sobretasa.test.ts
 *
 * Cubre los arreglos de 2026-09-14 sobre calidad de citas:
 *   - construirContexto() debe pasar la URL de la norma al modelo (sin ella
 *     inventaba los idNorma de BCN).
 *   - la regla del Art. 8 de la Ley 17.235 debe activarse en consultas sobre
 *     suelo y contribuciones, que es donde esta la sobretasa del 100%.
 */

import { describe, it, expect } from "vitest";
import { construirContexto } from "@/lib/rag";
import { aplicarReglas, REGLAS_INICIALES } from "@/lib/motor-reglas";
import type { ChunkRecuperado } from "@/lib/rag";

function chunk(over: Partial<ChunkRecuperado> = {}): ChunkRecuperado {
  return {
    id: "c1",
    texto: "Artículo 8º.- Los bienes raíces no agrícolas...",
    similarity: 0.7,
    norma_tipo: "LEY",
    norma_numero: "17235",
    norma_titulo: "Impuesto Territorial",
    articulo: "8",
    jerarquia: null,
    url_fuente: "https://www.bcn.cl/leychile/navegar?idNorma=28849",
    fecha_vigencia_desde: null,
    norma_dominio: "tributario",
    norma_organo_emisor: null,
    norma_jerarquia_norm: "ley",
    norma_etapas_proyecto: [],
    ...over,
  };
}

describe("construirContexto - URL de la norma", () => {
  it("incluye la URL real en el bloque de la fuente", () => {
    const { textoContexto } = construirContexto([chunk()]);
    expect(textoContexto).toContain("URL: https://www.bcn.cl/leychile/navegar?idNorma=28849");
  });

  it("no inventa un campo URL cuando la fuente no la trae", () => {
    const { textoContexto } = construirContexto([chunk({ url_fuente: "" })]);
    expect(textoContexto).not.toContain("URL:");
  });
});

describe("regla del Art. 8 - sobretasa de sitios no edificados", () => {
  const dispara = (pregunta: string) =>
    aplicarReglas(pregunta, REGLAS_INICIALES).some(
      (r) => r.regla.id === "sobretasa-sitio-no-edificado-art8"
    );

  it("se activa en la consulta real que la destapo", () => {
    expect(
      dispara(
        "si tengo un terreno urbano y tengo una empresa que vende terrenos agricolas para el desarrollo inmobiliario, cuales son los riesgos que el SII genere un cambio de la clasificacion del terreno matriz y que me aumenten las contribuciones?"
      )
    ).toBe(true);
  });

  it("se activa con avaluo y loteo, y con acentos", () => {
    expect(dispara("¿Cómo afecta el avalúo fiscal de un loteo sin construir?")).toBe(true);
  });

  it("se activa con impuesto territorial y sitio no edificado", () => {
    expect(dispara("impuesto territorial de un sitio no edificado en area urbana")).toBe(true);
  });

  it("no se activa en consultas urbanisticas sin arista tributaria", () => {
    expect(dispara("cual es la rasante aplicable en zona urbana para un edificio de 5 pisos")).toBe(false);
  });

  it("no se activa en consultas tributarias sin suelo", () => {
    expect(dispara("como se calcula el IVA en la prestacion de un servicio profesional")).toBe(false);
  });

  it("fuerza el articulo 8 de la Ley 17.235", () => {
    const regla = REGLAS_INICIALES.find((r) => r.id === "sobretasa-sitio-no-edificado-art8");
    expect(regla?.forzar_normas).toContain("LEY-17235:8");
  });
});