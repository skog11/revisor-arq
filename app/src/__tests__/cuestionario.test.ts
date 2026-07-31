import { describe, expect, it } from "vitest";

import { detectarCuestionario } from "@/lib/cuestionario";

describe("detectarCuestionario", () => {
  it("no intercepta consultas con una referencia normativa explícita", () => {
    const resultado = detectarCuestionario(
      "¿Qué dice el Art. 9999 de la LGUC sobre alturas máximas?",
      { confianza: "baja" },
    );

    expect(resultado).toBeNull();
  });

  it("sigue solicitando contexto para consultas ambiguas de baja confianza", () => {
    const resultado = detectarCuestionario(
      "¿Qué necesito para mi proyecto?",
      { confianza: "baja" },
    );

    expect(resultado?.preguntas.map((pregunta) => pregunta.id)).toEqual([
      "zona_suelo",
      "destino",
      "aspecto",
    ]);
  });

  it("prioriza el cuestionario de análisis cuando existe un documento adjunto", () => {
    const resultado = detectarCuestionario(
      "Analiza este CIP\n--- CONTEXTO DEL PROYECTO ---",
      { confianza: "baja" },
    );

    expect(resultado?.preguntas.map((pregunta) => pregunta.id)).toEqual([
      "objetivo",
      "etapa",
    ]);
  });
});
