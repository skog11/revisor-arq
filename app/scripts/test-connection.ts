/**
 * Verifica conexión a Supabase, Gemini y Voyage.
 * Uso: npm run test:connection
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  let pass = 0;
  let fail = 0;

  // ── 1. Supabase ───────────────────────────────────────────
  process.stdout.write("Supabase... ");
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await supabase.from("normas").select("id", { count: "exact", head: true });
    if (error && error.code !== "42P01") {
      // 42P01 = tabla no existe todavía (antes de correr el schema), es esperado
      throw error;
    }
    console.log("✓ OK");
    pass++;
  } catch (e) {
    console.log("✗ FALLO:", (e as Error).message);
    fail++;
  }

  // ── 2. Gemini ─────────────────────────────────────────────
  process.stdout.write("Gemini...   ");
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
    const result = await model.generateContent("Responde solo 'ok'.");
    const text = result.response.text();
    if (!text) throw new Error("Respuesta vacía");
    console.log("✓ OK —", text.slice(0, 60).trim());
    pass++;
  } catch (e) {
    console.log("✗ FALLO:", (e as Error).message);
    fail++;
  }

  // ── 3. Voyage ─────────────────────────────────────────────
  process.stdout.write("Voyage...   ");
  try {
    const VoyageAIClient = (await import("voyageai")).default;
    const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
    const result = await voyage.embed({
      input: ["texto de prueba para embedding"],
      model: "voyage-law-2",
    });
    const dim = (result.data?.[0]?.embedding as number[])?.length;
    if (dim !== 1024) throw new Error(`Dimensión inesperada: ${dim}`);
    console.log(`✓ OK — dim=${dim}`);
    pass++;
  } catch (e) {
    console.log("✗ FALLO:", (e as Error).message);
    fail++;
  }

  // ── Resumen ───────────────────────────────────────────────
  console.log(`\n${pass}/3 servicios OK${fail > 0 ? ` — ${fail} fallo(s)` : ""}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
