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

describe("aplicarReglas — redondeo de coeficientes y parámetros urbanísticos", () => {
  it("activa la regla con el caso real de producción (decimal + casas + pregunta de redondeo)", () => {
    // Visto en producción el 2026-09-07: el retrieval semántico (72% similitud,
    // 11 fuentes) no trajo el Art. 1.4.8 OGUC porque la consulta nunca usa las
    // palabras "redondeo" ni "fracción" — solo un número con decimales.
    const pregunta =
      "cuando hago el calculo de densidad para un terreno y este calculo me indica que caben 97,66 casas, " +
      "esto implica que de acuerdo a la normativa vigente caben 97 o caben 98?";
    expect(reglasActivasPara(pregunta)).toContain("redondeo-parametros-urbanisticos");
  });

  it("activa la regla con vocabulario explícito de redondeo, sin número decimal", () => {
    expect(
      reglasActivasPara("¿Cómo se redondea el coeficiente de constructibilidad en la OGUC?")
    ).toContain("redondeo-parametros-urbanisticos");
  });

  it("no se activa con un número decimal que no acompaña unidades habitacionales", () => {
    expect(
      reglasActivasPara("El coeficiente de ocupación de suelo es 0,6, ¿qué significa?")
    ).not.toContain("redondeo-parametros-urbanisticos");
  });

  it("no se activa con una consulta sin números ni vocabulario de redondeo", () => {
    expect(reglasActivasPara("¿Qué es la densidad de ocupación?")).not.toContain(
      "redondeo-parametros-urbanisticos"
    );
  });
});
