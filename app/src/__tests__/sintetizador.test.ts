/**
 * sintetizador.test.ts
 * Tests unitarios para buildSystemPromptV2().
 *
 * Cobertura:
 *   - Disclaimer presente en los 3 modos (arquitecto, abogado, profundo)
 *   - Instrucciones estructurales de cada modo
 *   - Contexto del proyecto inyectado cuando confianza != "baja"
 *   - Contexto del proyecto omitido cuando confianza == "baja"
 *   - Guardrail para artículo con número > 999
 *   - Guardrail para DDU con número > 600
 *   - Sin guardrail para referencias válidas
 *   - Cruces normativos incluidos en el prompt
 *   - Relaciones del grafo incluidas en el prompt
 */

import { describe, it, expect } from "vitest";
import { buildSystemPromptV2 } from "@/lib/sintetizador";
import type { CruceDetectado, ModoRespuesta } from "@/lib/rag";
import type { QueryClassificada } from "@/lib/clasificador";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONTEXTO = "Art. 116 LGUC: se requiere permiso de edificación.";
const RELACIONES = "LGUC Art. 116 remite a OGUC Art. 5.1.1.";

const CLASIFICACION_ALTA: QueryClassificada = {
  tipo_proyecto: "edificacion_nueva",
  etapa: "ingreso_permiso",
  dominios_detectados: ["urbanismo", "construccion"],
  keywords_normativas: ["Art. 116", "permiso"],
  requiere_jerarquia: false,
  confianza: "alta",
  resumen_consulta: "Consulta sobre permiso de edificación para vivienda nueva.",
};

const CLASIFICACION_BAJA: QueryClassificada = {
  ...CLASIFICACION_ALTA,
  confianza: "baja",
};

const CRUCE: CruceDetectado = {
  area: "Medioambiente",
  emoji: "🌿",
  organismo: "SEA / SEREMI del Medio Ambiente",
  norma_probable: "Ley N°19.300, DS 40/2012",
  gatillante: "proyecto con movimiento de tierras",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildPrompt(
  modo: ModoRespuesta,
  opts: {
    clasificacion?: QueryClassificada;
    cruces?: CruceDetectado[];
    relaciones?: string;
  } = {}
): string {
  return buildSystemPromptV2(
    modo,
    CONTEXTO,
    opts.cruces ?? [],
    opts.clasificacion,
    opts.relaciones
  );
}

// ─── Disclaimers en los 3 modos ───────────────────────────────────────────────

describe("buildSystemPromptV2 — disclaimer obligatorio", () => {
  it("modo arquitecto incluye variante de disclaimer para arquitectos", () => {
    const prompt = buildPrompt("arquitecto");
    // El disclaimer DISCLAIMER_ARQ contiene 'profesional habilitado'
    expect(prompt).toContain("profesional habilitado");
  });

  it("modo abogado incluye variante de disclaimer para abogados", () => {
    const prompt = buildPrompt("abogado");
    expect(prompt).toContain("profesional habilitado");
  });

  it("modo profundo incluye variante de disclaimer", () => {
    const prompt = buildPrompt("profundo");
    // DISCLAIMER_PRO contiene 'REVISOR ARQ'
    expect(prompt).toContain("REVISOR ARQ");
    expect(prompt).toContain("orientativo");
  });
});

// ─── Instrucciones estructurales por modo ─────────────────────────────────────

describe("buildSystemPromptV2 — instrucciones por modo", () => {
  it("modo arquitecto genera sección 'Checklist de cumplimiento'", () => {
    const prompt = buildPrompt("arquitecto");
    expect(prompt).toContain('MODO ARQUITECTO — "Checklist de cumplimiento"');
  });

  it("modo arquitecto menciona 'Normativa aplicable' y 'Advertencias'", () => {
    const prompt = buildPrompt("arquitecto");
    expect(prompt).toContain("## Normativa aplicable");
    expect(prompt).toContain("## Advertencias");
  });

  it("modo abogado genera sección 'Fundamento jurídico citado'", () => {
    const prompt = buildPrompt("abogado");
    expect(prompt).toContain('MODO ABOGADO — "Fundamento jurídico citado"');
  });

  it("modo abogado menciona 'Jerarquía normativa' y 'Concordancias'", () => {
    const prompt = buildPrompt("abogado");
    expect(prompt).toContain("## Jerarquía normativa activada");
    expect(prompt).toContain("## Concordancias");
  });

  it("modo profundo genera 'Informe técnico normativo' con 8 secciones", () => {
    const prompt = buildPrompt("profundo");
    expect(prompt).toContain('MODO PROFUNDO — "Informe técnico normativo"');
    expect(prompt).toContain("## 1. Síntesis ejecutiva");
    expect(prompt).toContain("## 8. Fuentes verificadas");
  });
});

// ─── Contexto del proyecto (clasificación) ────────────────────────────────────

describe("buildSystemPromptV2 — contexto del proyecto", () => {
  it("inyecta contexto del proyecto cuando confianza es 'alta'", () => {
    const prompt = buildPrompt("arquitecto", { clasificacion: CLASIFICACION_ALTA });
    expect(prompt).toContain("CONTEXTO DEL PROYECTO DETECTADO");
    expect(prompt).toContain("edificacion nueva"); // tipo_proyecto con _ → espacio
  });

  it("inyecta contexto cuando confianza es 'media'", () => {
    const clasificacionMedia = { ...CLASIFICACION_ALTA, confianza: "media" as const };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificacionMedia });
    expect(prompt).toContain("CONTEXTO DEL PROYECTO DETECTADO");
  });

  it("omite contexto del proyecto cuando confianza es 'baja'", () => {
    const prompt = buildPrompt("arquitecto", { clasificacion: CLASIFICACION_BAJA });
    expect(prompt).not.toContain("CONTEXTO DEL PROYECTO DETECTADO");
  });

  it("omite contexto del proyecto cuando clasificacion es undefined", () => {
    const prompt = buildPrompt("arquitecto"); // sin clasificacion
    expect(prompt).not.toContain("CONTEXTO DEL PROYECTO DETECTADO");
  });

  it("muestra advertencia de jerarquía cuando requiere_jerarquia es true", () => {
    const clasificConJerarquia = { ...CLASIFICACION_ALTA, requiere_jerarquia: true };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificConJerarquia });
    expect(prompt).toContain("jerarquía normativa");
  });
});

// ─── Guardrail: artículo fuera de rango ──────────────────────────────────────

describe("buildSystemPromptV2 — guardrail artículos inexistentes", () => {
  it("activa GUARDRAIL CRÍTICO ACTIVO para Art. 9999", () => {
    const clasificConArticulo9999: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["Art. 9999"],
    };
    const prompt = buildPrompt("abogado", { clasificacion: clasificConArticulo9999 });
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
    expect(prompt).toContain("Art. 9999");
  });

  it("activa guardrail para Artículo 10000", () => {
    const clasificConArt10000: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["Artículo 10000"],
    };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificConArt10000 });
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
  });

  it("NO activa guardrail para Art. 116 (número válido)", () => {
    const prompt = buildPrompt("arquitecto", { clasificacion: CLASIFICACION_ALTA });
    // CLASIFICACION_ALTA tiene keywords_normativas: ["Art. 116", "permiso"]
    expect(prompt).not.toContain("GUARDRAIL CRÍTICO ACTIVO");
  });

  it("el guardrail obliga usar la frase 'base de conocimiento' en la respuesta esperada", () => {
    const clasificConArt9999: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["Art. 9999"],
    };
    const prompt = buildPrompt("abogado", { clasificacion: clasificConArt9999 });
    expect(prompt).toContain("base de conocimiento");
  });
});

// ─── Guardrail: DDU fuera de rango ────────────────────────────────────────────

describe("buildSystemPromptV2 — guardrail DDU inexistente", () => {
  it("activa GUARDRAIL CRÍTICO ACTIVO para DDU 999", () => {
    const clasificConDDU999: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["DDU 999"],
    };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificConDDU999 });
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
    expect(prompt).toContain("DDU 999");
  });

  it("activa guardrail para DDU-700 (sobre el límite de 600)", () => {
    const clasificConDDU700: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["DDU-700"],
    };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificConDDU700 });
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
  });

  it("NO activa guardrail para DDU 541 (válida)", () => {
    const clasificConDDU541: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: ["DDU 541"],
    };
    const prompt = buildPrompt("arquitecto", { clasificacion: clasificConDDU541 });
    expect(prompt).not.toContain("GUARDRAIL CRÍTICO ACTIVO");
  });
});

// ─── Cruces regulatorios ──────────────────────────────────────────────────────

describe("buildSystemPromptV2 — cruces normativos", () => {
  it("incluye el área del cruce cuando se pasa un cruce detectado", () => {
    const prompt = buildPrompt("abogado", { cruces: [CRUCE] });
    expect(prompt).toContain("Medioambiente");
    expect(prompt).toContain("SEA / SEREMI del Medio Ambiente");
  });

  it("incluye el texto gatillante del cruce", () => {
    const prompt = buildPrompt("arquitecto", { cruces: [CRUCE] });
    expect(prompt).toContain("proyecto con movimiento de tierras");
  });

  it("no incluye bloque de cruces cuando el array está vacío", () => {
    const prompt = buildPrompt("arquitecto", { cruces: [] });
    expect(prompt).not.toContain("DOMINIOS NORMATIVOS ADICIONALES DETECTADOS");
  });
});

// ─── Relaciones del grafo ─────────────────────────────────────────────────────

describe("buildSystemPromptV2 — relaciones normativas", () => {
  it("incluye texto de relaciones del grafo en el prompt", () => {
    const prompt = buildPrompt("abogado", { relaciones: RELACIONES });
    expect(prompt).toContain("LGUC Art. 116 remite a OGUC Art. 5.1.1.");
  });

  it("sin relaciones no genera texto de relaciones", () => {
    const prompt = buildPrompt("arquitecto"); // relaciones = undefined
    expect(prompt).not.toContain("LGUC Art. 116 remite");
  });
});

// ─── Guardrail: contexto vacío ────────────────────────────────────────────────

describe("buildSystemPromptV2 — guardrail contexto vacío", () => {
  it("activa guardrail SIN CONTEXTO cuando contexto está vacío", () => {
    const prompt = buildSystemPromptV2("arquitecto", "", [], CLASIFICACION_ALTA);
    expect(prompt).toContain("SIN CONTEXTO RECUPERADO");
    expect(prompt).toContain("NUNCA improvises ni inventes");
  });

  it("activa guardrail SIN CONTEXTO cuando contexto es muy corto (< 80 chars)", () => {
    const prompt = buildSystemPromptV2("abogado", "solo texto", [], CLASIFICACION_ALTA);
    expect(prompt).toContain("SIN CONTEXTO RECUPERADO");
  });

  it("NO activa guardrail de contexto cuando hay contexto suficiente", () => {
    const prompt = buildPrompt("arquitecto");
    expect(prompt).not.toContain("SIN CONTEXTO RECUPERADO");
  });
});

// ─── Guardrail: detección directa en texto de pregunta ───────────────────────

describe("buildSystemPromptV2 — guardrail desde texto de pregunta", () => {
  it("activa guardrail cuando Art. 9999 aparece en pregunta (sin keywords_normativas)", () => {
    const clasificSinKeywords: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: [], // clasificador no extrajo la referencia
    };
    const prompt = buildSystemPromptV2(
      "abogado", CONTEXTO, [], clasificSinKeywords, undefined,
      "¿Qué dice el Art. 9999 de la LGUC?"
    );
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
    expect(prompt).toContain("Art. 9999");
  });

  it("activa guardrail cuando DDU 800 aparece en pregunta (sin keywords_normativas)", () => {
    const clasificSinKeywords: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: [],
    };
    const prompt = buildSystemPromptV2(
      "arquitecto", CONTEXTO, [], clasificSinKeywords, undefined,
      "¿Qué establece la DDU 800?"
    );
    expect(prompt).toContain("GUARDRAIL CRÍTICO ACTIVO");
    expect(prompt).toContain("DDU 800");
  });

  it("NO activa guardrail cuando Art. 116 aparece en pregunta (válido)", () => {
    const clasificSinKeywords: QueryClassificada = {
      ...CLASIFICACION_ALTA,
      keywords_normativas: [],
    };
    const prompt = buildSystemPromptV2(
      "arquitecto", CONTEXTO, [], clasificSinKeywords, undefined,
      "¿Qué dice el Art. 116 de la LGUC?"
    );
    expect(prompt).not.toContain("GUARDRAIL CRÍTICO ACTIVO");
  });
});

// ─── Reglas absolutas (guardrails generales) ──────────────────────────────────

describe("buildSystemPromptV2 — reglas absolutas", () => {
  it("incluye regla de no inventar artículos en todos los modos", () => {
    for (const modo of ["arquitecto", "abogado", "profundo"] as ModoRespuesta[]) {
      const prompt = buildPrompt(modo);
      expect(prompt).toContain("NUNCA inventes artículos");
    }
  });

  it("incluye instrucción para detectar artículos fuera de rango en todos los modos", () => {
    for (const modo of ["arquitecto", "abogado", "profundo"] as ModoRespuesta[]) {
      const prompt = buildPrompt(modo);
      expect(prompt).toContain("base de conocimiento");
    }
  });

  it("incluye el contexto RAG en el prompt", () => {
    const prompt = buildPrompt("arquitecto");
    expect(prompt).toContain(CONTEXTO);
  });
});
