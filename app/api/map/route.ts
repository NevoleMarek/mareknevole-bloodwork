import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { mapVariablesPrompt } from "@/prompts/map-variables";
import type { MapRequest, MapResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY as string;
  assert(apiKey, "GEMINI_API_KEY is required");

  const body = (await request.json()) as MapRequest;
  assert(body.variables.length > 0, "No variables provided");

  const prompt = mapVariablesPrompt(
    JSON.stringify(body.vocabulary, null, 2),
    JSON.stringify(body.variables, null, 2),
  );

  const text = await callGemini(apiKey, prompt);
  const result = parseGeminiJson<MapResponse>(text);

  assert(result.mappings.length > 0, "No mappings returned");

  return Response.json(result);
}
