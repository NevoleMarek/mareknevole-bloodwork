import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { researchVariablesPrompt } from "@/prompts/research-variables";
import type { ResearchRequest, ResearchResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY as string;
  assert(apiKey, "GEMINI_API_KEY is required");

  const body = (await request.json()) as ResearchRequest;
  assert(body.newEntries.length > 0, "No entries to research");

  const prompt = researchVariablesPrompt(
    JSON.stringify(body.newEntries, null, 2),
  );

  const text = await callGemini(apiKey, "gemini-3.1-pro-preview", prompt);
  const result = parseGeminiJson<ResearchResponse>(text);

  assert(result.entries.length > 0, "No research results returned");

  return Response.json(result);
}
