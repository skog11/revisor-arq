import {
  GoogleGenerativeAI,
  type GenerateContentStreamResult,
} from "@google/generative-ai";

export const MODEL_NAME = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
}

export function getGeminiModel() {
  return getClient().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 4096 },
  });
}

export async function streamGemini(
  systemPrompt: string,
  userMessage: string,
): Promise<GenerateContentStreamResult> {
  const model = getGeminiModel();
  return model.generateContentStream(systemPrompt + "\n\n" + userMessage);
}

export async function generateGemini(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(systemPrompt + "\n\n" + userMessage);
  return result.response.text();
}
