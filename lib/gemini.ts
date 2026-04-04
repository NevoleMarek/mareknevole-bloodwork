import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import assert from "node:assert";

export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  pdfBase64?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });

  const parts: Part[] = pdfBase64
    ? [
        { text: prompt },
        { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      ]
    : [{ text: prompt }];

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  assert(text, "Gemini returned no text");
  return text;
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
