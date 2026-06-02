import { test, expect } from "@playwright/test";

const LLM_TIMEOUT = 75_000; // margen amplio por latencia variable del LLM

test.describe("Chat RAG — flujos principales", () => {
  test("carga la página del chat", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("los tres modos están disponibles", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("radio", { name: /Arquitecto/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Abogado/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Profundo/i })).toBeVisible();
  });

  test("enviar consulta genera respuesta con fuentes LGUC", async ({ page }) => {
    await page.goto("/chat");
    await page.locator("textarea").first().fill("¿Qué establece el Art. 116 de la LGUC?");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Art(?:ículo)?\.?\s*116/i)).toBeVisible({ timeout: LLM_TIMEOUT });
    await expect(page.getByText("LGUC")).toBeVisible();
  });

  test("guardrail: artículo inexistente declara falta de respaldo", async ({ page }) => {
    await page.goto("/chat");
    await page.locator("textarea").first().fill("¿Qué dice el Art. 9999 de la LGUC?");
    await page.keyboard.press("Enter");

    await expect(page.getByText(/base de conocimiento/i)).toBeVisible({ timeout: LLM_TIMEOUT });
  });

  test("landing page carga con heading principal", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("mobile: chat tiene textarea y modos visibles", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("textarea").first()).toBeVisible();
    await expect(page.getByRole("radio", { name: /Arquitecto/i })).toBeVisible();
  });
});
