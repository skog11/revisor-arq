/**
 * openrouter.test.ts
 * Cubre el descubrimiento de modelos gratuitos vigentes en el catálogo de
 * OpenRouter, agregado tras quedarse sin modelos el 2026-09-07 (los dos que
 * estaban hardcodeados pasaron a ser de pago con horas de diferencia).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamOpenRouter, _resetCacheModelos } from "@/lib/openrouter";

const CATALOGO = {
  data: [
    { id: "pago/grande", context_length: 1_000_000, pricing: { prompt: "0.0000005", completion: "0.000001" } },
    { id: "gratis/chico:free", context_length: 32_000, pricing: { prompt: "0", completion: "0" } },
    { id: "gratis/grande:free", context_length: 256_000, pricing: { prompt: "0", completion: "0" } },
    { id: "trampa/salida-paga:free", context_length: 900_000, pricing: { prompt: "0", completion: "0.000002" } },
  ],
};

/** Respuesta SSE mínima de OpenRouter con un solo token. */
function respuestaStream(texto: string): Response {
  const cuerpo = `data: ${JSON.stringify({ choices: [{ delta: { content: texto } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(new TextEncoder().encode(cuerpo), { status: 200 });
}

async function recolectar(gen: AsyncGenerator<string, void, unknown>): Promise<string> {
  let salida = "";
  for await (const texto of gen) salida += texto;
  return salida;
}

describe("streamOpenRouter — descubrimiento de modelos gratuitos", () => {
  beforeEach(() => {
    _resetCacheModelos();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa el modelo gratuito de mayor contexto del catálogo", async () => {
    const modelosPedidos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/models")) return Response.json(CATALOGO);
      modelosPedidos.push(JSON.parse(String(init?.body)).model);
      return respuestaStream("respuesta");
    }));

    const salida = await recolectar(streamOpenRouter("sistema", "consulta"));

    expect(salida).toBe("respuesta");
    expect(modelosPedidos).toEqual(["gratis/grande:free"]);
  });

  it("descarta modelos que cobran la salida aunque la entrada sea gratis", async () => {
    const modelosPedidos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/models")) return Response.json(CATALOGO);
      modelosPedidos.push(JSON.parse(String(init?.body)).model);
      return respuestaStream("ok");
    }));

    await recolectar(streamOpenRouter("sistema", "consulta"));

    expect(modelosPedidos).not.toContain("trampa/salida-paga:free");
    expect(modelosPedidos).not.toContain("pago/grande");
  });

  it("prueba el siguiente modelo gratuito cuando el primero ya no está disponible", async () => {
    const modelosPedidos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/models")) return Response.json(CATALOGO);
      const modelo = JSON.parse(String(init?.body)).model;
      modelosPedidos.push(modelo);
      if (modelo === "gratis/grande:free") {
        return new Response('{"error":{"message":"This model is unavailable for free."}}', { status: 404 });
      }
      return respuestaStream("respuesta del segundo");
    }));

    const salida = await recolectar(streamOpenRouter("sistema", "consulta"));

    expect(salida).toBe("respuesta del segundo");
    expect(modelosPedidos).toEqual(["gratis/grande:free", "gratis/chico:free"]);
  });

  it("cae a la lista semilla si el catálogo no responde", async () => {
    const modelosPedidos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/models")) return new Response("caído", { status: 503 });
      modelosPedidos.push(JSON.parse(String(init?.body)).model);
      return respuestaStream("ok");
    }));

    await recolectar(streamOpenRouter("sistema", "consulta"));

    expect(modelosPedidos[0]).toContain(":free");
  });
});
