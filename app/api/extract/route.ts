import { type Part, VertexAI } from "@google-cloud/vertexai";
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  BloodworkReading,
  ExtractedReading,
  MergeResult,
  Vocabulary,
} from "@/types/bloodwork";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function dataPath(filename: string) {
  return join(process.cwd(), "data", filename);
}

function promptPath(filename: string) {
  return join(process.cwd(), "prompts", filename);
}

async function callGemini(prompt: string, pdfBase64?: string): Promise<string> {
  const parts: Part[] = pdfBase64
    ? [
        { text: prompt },
        { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      ]
    : [{ text: prompt }];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });

  return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("pdf");

  if (!(file instanceof File)) {
    return Response.json({ error: "No PDF file provided" }, { status: 400 });
  }

  // Agent 1: extract structured reading from PDF
  const extractPrompt = readFileSync(promptPath("extract.txt"), "utf-8");
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const extractText = await callGemini(extractPrompt, base64);
  const extracted = parseJson<ExtractedReading>(extractText);

  // Agent 2: merge with vocabulary
  const vocabulary: Vocabulary = JSON.parse(
    readFileSync(dataPath("vocabulary.json"), "utf-8"),
  );

  const mergeTemplate = readFileSync(
    promptPath("vocabulary-merge.txt"),
    "utf-8",
  );
  const mergePrompt = mergeTemplate
    .replace("{{VOCABULARY}}", JSON.stringify(vocabulary, null, 2))
    .replace("{{EXTRACTED_READING}}", JSON.stringify(extracted, null, 2));

  const mergeText = await callGemini(mergePrompt);
  const mergeResult = parseJson<MergeResult>(mergeText);

  // Persist new vocabulary entries
  if (mergeResult.newVocabularyEntries.length > 0) {
    vocabulary.entries.push(...mergeResult.newVocabularyEntries);
    writeFileSync(
      dataPath("vocabulary.json"),
      JSON.stringify(vocabulary, null, 2),
    );
  }

  // Persist new reading
  const readings: BloodworkReading[] = JSON.parse(
    readFileSync(dataPath("readings.json"), "utf-8"),
  );
  const newReading: BloodworkReading = {
    date: mergeResult.date,
    source: file.name,
    measurements: mergeResult.normalizedMeasurements,
  };
  assert(newReading.measurements.length > 0, "Merge produced no measurements");
  readings.push(newReading);
  writeFileSync(dataPath("readings.json"), JSON.stringify(readings, null, 2));

  return Response.json({ success: true });
}
