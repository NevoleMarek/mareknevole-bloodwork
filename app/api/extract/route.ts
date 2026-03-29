import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import type { ExtractResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("pdf");
  assert(file instanceof File, "No PDF file provided");

  const prompt = readFileSync(
    join(process.cwd(), "prompts", "extract-variables.txt"),
    "utf-8",
  );
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const text = await callGemini(prompt, base64);
  const result = parseGeminiJson<ExtractResponse>(text);

  assert(result.date, "No date extracted");
  assert(result.variables.length > 0, "No variables extracted");

  return Response.json(result);
}
