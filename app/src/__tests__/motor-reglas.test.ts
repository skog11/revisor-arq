import { describe, expect, it } from "vitest";
import { aplicarReglas } from "@/lib/motor-reglas";

function reglasActivasPara(pregunta: string) {
  return aplicarReglas(pregunta).map(({ regla }) => regla.id);
}

describe("aplicarReglas — guardrails normativos", () => {
  it("activa la compuerta SEIA al mencionar SEIA", () => {
    expect(reglasActivasPara("¿Debo ingresar este proyecto al SEIA?")).toContain(
      "eia-seia-obligatorio"
    );
  });

  it("activa la compuerta de bien común cuando consulta por el administrador", () => {
    expect(
      reglasActivasPara("¿El administrador puede autorizar una techumbre en un patio común?")
    ).toContain("administrador-bien-comun");
  });

  it("activa la compuerta de bien nacional al instalar en una plaza", () => {
    expect(reglasActivasPara("¿Puedo instalar un local permanente en una plaza?")).toContain(
      "bien-nacional-uso-publico"
    );
  });
});
