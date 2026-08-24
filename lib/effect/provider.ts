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
import {
  ApplicationConfig,
  type ApplicationConfigContract,
} from "@/lib/effect/config";

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

export type GeminiModel = Pick<GenerativeModel, "generateContent">;
export type GeminiClient = {
  readonly getGenerativeModel: (
    modelParams: Parameters<GoogleGenerativeAI["getGenerativeModel"]>[0],
  ) => GeminiModel;
};

const defaultCreateClient = (apiKey: string): GeminiClient =>
  new GoogleGenerativeAI(apiKey);

export const FLASH_MODEL = "gemini-3-flash-preview";
export const PRO_MODEL = "gemini-3.1-pro-preview";

export interface GeminiModelHandles {
  readonly flash: GeminiModel;
  readonly pro: GeminiModel;
}

/** Acquire the finite model set once while constructing the owning service. */
export const acquireGeminiModels = (
  apiKey: Redacted.Redacted<string>,
  createClient: (apiKey: string) => GeminiClient = defaultCreateClient,
): GeminiModelHandles => {
  const client = createClient(Redacted.value(apiKey));
  return {
    flash: client.getGenerativeModel({ model: FLASH_MODEL }),
    pro: client.getGenerativeModel({ model: PRO_MODEL }),
  };
};

/** Keep the Effect cancellation signal attached to the SDK request. */
export const generateContentWithSignal = (
  model: GeminiModel,
  request: Parameters<GeminiModel["generateContent"]>[0],
  signal: AbortSignal,
) => model.generateContent(request, { signal });

const modelForName = (
  models: GeminiModelHandles,
  model: string,
): GeminiModel | undefined => {
  if (model === FLASH_MODEL) return models.flash;
  if (model === PRO_MODEL) return models.pro;
  return undefined;
};

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

export const makeGenerate = (
  config: Pick<ApplicationConfigContract, "requireGeminiApiKey">,
  models: GeminiModelHandles | undefined,
) =>
  Effect.fn("Gemini.generate")(function* (
    model: string,
    prompt: string,
    pdfBase64?: string,
  ) {
    if (models === undefined) {
      yield* config.requireGeminiApiKey();
      return yield* Effect.fail(
        new ProviderError({
          operation: "Gemini.generate.client",
          cause: new Error("Gemini client was not acquired"),
        }),
      );
    }
    const genModel = modelForName(models, model);
    if (genModel === undefined) {
      return yield* Effect.fail(
        new ProviderError({
          operation: "Gemini.generate.model",
          cause: new Error("Unsupported Gemini model"),
        }),
      );
    }
    const result = yield* Effect.tryPromise({
      try: async (signal) => {
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

export const makeLayer = (
  createClient: (apiKey: string) => GeminiClient = defaultCreateClient,
) =>
  Layer.effect(
    Gemini,
    Effect.gen(function* () {
      const config = yield* ApplicationConfig;
      const apiKey =
        config.geminiApiKey === undefined
          ? undefined
          : yield* config.requireGeminiApiKey();
      const models =
        apiKey === undefined
          ? undefined
          : yield* Effect.try({
              try: () => acquireGeminiModels(apiKey, createClient),
              catch: (cause) =>
                new ProviderError({ operation: "Gemini.acquire", cause }),
            });
      const generate = makeGenerate(config, models);

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

export const layer = makeLayer();

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
