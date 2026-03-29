import { type Part, VertexAI } from "@google-cloud/vertexai";
import assert from "node:assert";

function getModel() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  assert(project, "GOOGLE_CLOUD_PROJECT is required");
  const vertexAI = new VertexAI({
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
  });
  return vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function callGemini(
  prompt: string,
  pdfBase64?: string,
): Promise<string> {
  const parts: Part[] = pdfBase64
    ? [
        { text: prompt },
        { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      ]
    : [{ text: prompt }];

  const model = getModel();
  const result = await model.generateContent({
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
