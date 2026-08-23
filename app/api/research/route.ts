import assert from "node:assert";
import * as Schema from "effect/Schema";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import {
  ResearchRequestSchema,
  ResearchResponseSchema,
} from "@/lib/domain-schemas";
import { researchVariablesPrompt } from "@/prompts/research-variables";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY;
  assert(apiKey, "GEMINI_API_KEY is required");

  const body = Schema.decodeUnknownSync(ResearchRequestSchema)(
    await request.json(),
  );
  assert(body.newEntries.length > 0, "No entries to research");

  const prompt = researchVariablesPrompt(
    JSON.stringify(body.newEntries, null, 2),
  );

  const text = await callGemini(apiKey, "gemini-3.1-pro-preview", prompt);
  const result = Schema.decodeUnknownSync(ResearchResponseSchema)(
    parseGeminiJson(text),
  );

  assert(result.entries.length > 0, "No research results returned");

  return Response.json(result);
}
