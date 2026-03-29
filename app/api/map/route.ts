import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import type { MapRequest, MapResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const body = (await request.json()) as MapRequest;
  assert(body.variables.length > 0, "No variables provided");

  const template = readFileSync(
    join(process.cwd(), "prompts", "map-variables.txt"),
    "utf-8",
  );
  const prompt = template
    .replace("{{VOCABULARY}}", JSON.stringify(body.vocabulary, null, 2))
    .replace("{{VARIABLES}}", JSON.stringify(body.variables, null, 2));

  const text = await callGemini(prompt);
  const result = parseGeminiJson<MapResponse>(text);

  assert(result.mappings.length > 0, "No mappings returned");

  return Response.json(result);
}
