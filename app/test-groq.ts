import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say hello" }],
      model: "llama-3.1-8b-instant",
    });
    console.log("Groq OK:", chatCompletion.choices[0].message.content);
  } catch (e) {
    console.error("Groq Error:", e instanceof Error ? e.message : String(e));
  }
}
test();
