import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import assert from "node:assert";
import * as Schema from "effect/Schema";

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

export function parseGeminiJson(text: string): Schema.Json {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return Schema.decodeUnknownSync(Schema.Json)(JSON.parse(cleaned));
}
