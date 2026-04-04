import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { extractVariablesPrompt } from "@/prompts/extract-variables";
import type { ExtractResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY as string;
  assert(apiKey, "GEMINI_API_KEY is required");

  const formData = await request.formData();
  const file = formData.get("pdf");
  assert(file instanceof File, "No PDF file provided");

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const text = await callGemini(
    apiKey,
    "gemini-3-flash-preview",
    extractVariablesPrompt,
    base64,
  );
  const result = parseGeminiJson<ExtractResponse>(text);

  assert(result.date, "No date extracted");
  assert(result.variables.length > 0, "No variables extracted");

  return Response.json(result);
}
