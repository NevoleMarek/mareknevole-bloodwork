import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

/**
 * Compatibility parser for scripts/tests. Production provider calls live in
 * `lib/effect/provider.ts`, where SDK failures and response decoding stay in
 * the Effect error channel.
 */
export function parseGeminiJson(text: string): Schema.Json {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  const decoded = Schema.decodeUnknownResult(Schema.Json)(JSON.parse(cleaned));
  if (Result.isFailure(decoded)) {
    throw new Error("Gemini response was not JSON");
  }
  return decoded.success;
}
