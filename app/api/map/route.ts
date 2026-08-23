import assert from "node:assert";
import * as Schema from "effect/Schema";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { MapRequestSchema, MapResponseSchema } from "@/lib/domain-schemas";
import { mapVariablesPrompt } from "@/prompts/map-variables";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY;
  assert(apiKey, "GEMINI_API_KEY is required");

  const body = Schema.decodeUnknownSync(MapRequestSchema)(await request.json());
  assert(body.variables.length > 0, "No variables provided");

  const prompt = mapVariablesPrompt(
    JSON.stringify(body.vocabulary, null, 2),
    JSON.stringify(body.variables, null, 2),
  );

  const text = await callGemini(apiKey, "gemini-3-flash-preview", prompt);
  const result = Schema.decodeUnknownSync(MapResponseSchema)(
    parseGeminiJson(text),
  );

  assert(result.mappings.length > 0, "No mappings returned");

  return Response.json(result);
}
