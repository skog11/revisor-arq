import { describe, expect, it } from "vitest";
import {
  esRespuestaSinRespaldoVerificable,
  obtenerEsperaEntreCasos,
  obtenerNombreArchivoResultados,
} from "../../scripts/eval/config";

describe("esRespuestaSinRespaldoVerificable", () => {
  it("reconoce el fallback estándar aunque cambien tildes o espacios", () => {
    expect(
      esRespuestaSinRespaldoVerificable(
        "No encontré  respaldo verificable para esta referencia. No puedo entregar una conclusión verificable.",
      ),
    ).toBe(true);
  });

  it("no convierte una respuesta cautelar distinta en un error transitorio", () => {
    expect(
      esRespuestaSinRespaldoVerificable(
        "No hay antecedentes suficientes para responder con seguridad.",
      ),
    ).toBe(false);
  });
});

describe("obtenerEsperaEntreCasos", () => {
  it("mantiene la espera conservadora por defecto", () => {
    expect(obtenerEsperaEntreCasos({})).toBe(30_000);
  });

  it("acepta una espera explícita de cero para una evaluación local", () => {
    expect(obtenerEsperaEntreCasos({ EVAL_DELAY_MS: "0" })).toBe(0);
  });

  it("descarta valores inválidos y conserva el valor por defecto", () => {
    expect(obtenerEsperaEntreCasos({ EVAL_DELAY_MS: "-1" })).toBe(30_000);
  });
});

describe("obtenerNombreArchivoResultados", () => {
  it("conserva el archivo diario para una evaluación completa", () => {
    expect(obtenerNombreArchivoResultados("2026-07-26")).toBe("2026-07-26.json");
  });

  it("separa una evaluación aislada para no sobrescribir la corrida completa", () => {
    expect(
      obtenerNombreArchivoResultados(
        "2026-07-26",
        "guardrail-articuloinexistente",
      ),
    ).toBe("2026-07-26-guardrail-articuloinexistente.json");
  });
});
