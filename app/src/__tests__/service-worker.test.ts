import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

function cargarServiceWorker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const selfMock = {
    addEventListener: (tipo: string, handler: (event: unknown) => void) => {
      handlers.set(tipo, handler);
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const cachesMock = {
    open: vi.fn(),
    keys: vi.fn(),
    delete: vi.fn(),
    match: vi.fn().mockResolvedValue(new Response("contenido-obsoleto")),
  };
  const fetchMock = vi.fn().mockResolvedValue(new Response("contenido-actual"));
  const codigo = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

  new Function("self", "caches", "fetch", codigo)(selfMock, cachesMock, fetchMock);

  return {
    fetchHandler: handlers.get("fetch"),
    cachesMock,
    fetchMock,
  };
}

describe("service worker", () => {
  it("prioriza la red en una navegación aunque exista una página en caché", async () => {
    const { fetchHandler, cachesMock, fetchMock } = cargarServiceWorker();
    let respuesta: Promise<Response> | undefined;

    fetchHandler?.({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://revisor-arq.vercel.app/",
      },
      respondWith: (promesa: Promise<Response>) => {
        respuesta = promesa;
      },
    });

    expect(respuesta).toBeDefined();
    expect(await (await respuesta!).text()).toBe("contenido-actual");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(cachesMock.match).not.toHaveBeenCalledWith(
      expect.objectContaining({ mode: "navigate" })
    );
  });
});
