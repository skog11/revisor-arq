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

  it("no pide contexto cuando la baja confianza viene de un clasificador caído", () => {
    // FALLBACK del clasificador trae confianza "baja" aunque la consulta sea
    // clara: presentar una caída del servicio como "consulta ambigua" hacía
    // aparecer el cuestionario en todas las consultas (visto el 2026-09-07,
    // con la cadena de LLM sin cuota).
    const resultado = detectarCuestionario(
      "Analiza el régimen de subdivisión predial",
      { confianza: "baja", clasificacion_fallida: true },
    );

    expect(resultado).toBeNull();
  });

  it("no vuelve a pedir contexto cuando la consulta ya trae las respuestas", () => {
    // Mismo formato exacto que arma chat/page.tsx al reenviar el cuestionario.
    const respuestas = [
      "- ¿El predio está dentro o fuera del límite urbano?\n  → Urbano",
      "- ¿Cuál es el destino principal de la edificación?\n  → Residencial",
      "- ¿Qué aspecto específico necesita resolver?\n  → altura maxima",
    ].join("\n");
    const preguntaEnriquecida = `que es una rasante\n\n---\nInformación adicional proporcionada:\n${respuestas}`;

    const resultado = detectarCuestionario(preguntaEnriquecida, { confianza: "baja" });

    expect(resultado).toBeNull();
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
