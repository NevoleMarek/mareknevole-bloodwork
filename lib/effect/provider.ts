import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import {
  ConfigurationError,
  ProviderDecodeError,
  ProviderError,
  ProviderRejected,
  ValidationError,
} from "@/lib/effect/errors";
import { ApplicationConfig } from "@/lib/effect/config";

export interface GeminiContract {
  readonly generate: (
    model: string,
    prompt: string,
    pdfBase64?: string,
  ) => Effect.Effect<
    string,
    ProviderError | ConfigurationError | ProviderRejected
  >;
  readonly decodeJson: <S extends Schema.Top>(
    schema: S,
    text: string,
    operation: string,
  ) => Effect.Effect<S["Type"], ProviderDecodeError, S["DecodingServices"]>;
}

export class Gemini extends Context.Service<Gemini, GeminiContract>()(
  "Bloodwork/Gemini",
) {}

type GeminiModel = Pick<GenerativeModel, "generateContent">;

/** Keep the Effect cancellation signal attached to the SDK request. */
export const generateContentWithSignal = (
  model: GeminiModel,
  request: Parameters<GeminiModel["generateContent"]>[0],
  signal: AbortSignal,
) => model.generateContent(request, { signal });

const parseJson = (text: string): Schema.Json => {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  const decoded = Schema.decodeUnknownResult(Schema.Json)(JSON.parse(cleaned));
  if (Result.isFailure(decoded)) {
    throw new Error("Provider response was not JSON");
  }
  return decoded.success;
};

export const layer = Layer.effect(
  Gemini,
  Effect.gen(function* () {
    const config = yield* ApplicationConfig;
    const generate = Effect.fn("Gemini.generate")(function* (
      model: string,
      prompt: string,
      pdfBase64?: string,
    ) {
      const apiKey = Redacted.value(yield* config.requireGeminiApiKey());
      const result = yield* Effect.tryPromise({
        try: async (signal) => {
          const genAI = new GoogleGenerativeAI(apiKey);
          const genModel = genAI.getGenerativeModel({ model });
          const parts: Part[] = pdfBase64
            ? [
                { text: prompt },
                {
                  inlineData: { data: pdfBase64, mimeType: "application/pdf" },
                },
              ]
            : [{ text: prompt }];
          return generateContentWithSignal(
            genModel,
            { contents: [{ role: "user", parts }] },
            signal,
          );
        },
        catch: (cause) => {
          const statusResult = Schema.decodeUnknownResult(
            Schema.Struct({ status: Schema.Number }),
          )(cause);
          const status = Result.isSuccess(statusResult)
            ? statusResult.success.status
            : undefined;
          return status === null || status === undefined
            ? new ProviderError({ operation: "Gemini.generate", cause })
            : new ProviderRejected({ operation: "Gemini.generate", status });
        },
      });
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return yield* Effect.fail(
          new ProviderError({
            operation: "Gemini.generate.empty-response",
            cause: new Error("Gemini returned no text"),
          }),
        );
      }
      return text;
    });

    const decodeJson = Effect.fn("Gemini.decodeJson")(function* <
      S extends Schema.Top,
    >(schema: S, text: string, operation: string) {
      const decodedJson = yield* Effect.try({
        try: () => parseJson(text),
        catch: (cause) => new ProviderDecodeError({ operation, cause }),
      });
      return yield* Schema.decodeUnknownEffect(schema)(decodedJson).pipe(
        Effect.mapError(
          (cause) => new ProviderDecodeError({ operation, cause }),
        ),
      );
    });

    return Gemini.of({ generate, decodeJson });
  }),
);

/** Validate provider workflows that must return at least one item. */
export const requireNonEmpty = <A>(
  values: ReadonlyArray<A>,
  operation: string,
): Effect.Effect<ReadonlyArray<A>, ValidationError> =>
  values.length > 0
    ? Effect.succeed(values)
    : Effect.fail(
        new ValidationError({ operation, message: "No provider results" }),
      );
