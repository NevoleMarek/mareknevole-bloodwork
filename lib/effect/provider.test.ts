import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { describe, expect, it } from "vitest";

import { ApplicationConfig } from "@/lib/effect/config";
import { ConfigurationError, ProviderError } from "@/lib/effect/errors";
import {
  FLASH_MODEL,
  Gemini,
  PRO_MODEL,
  generateContentWithSignal,
  makeLayer,
} from "@/lib/effect/provider";

describe("Gemini adapter cancellation", () => {
  it("forwards the Effect tryPromise AbortSignal to generateContent", async () => {
    let receivedSignal: AbortSignal | undefined;
    const model = {
      generateContent: (
        _request: Parameters<typeof generateContentWithSignal>[1],
        options?: { readonly signal?: AbortSignal },
      ) => {
        receivedSignal = options?.signal;
        return Promise.reject(new Error("sentinel"));
      },
    };

    const request = Effect.tryPromise({
      try: (signal) => generateContentWithSignal(model, "prompt", signal),
      catch: (cause) => cause,
    });

    await expect(Effect.runPromise(request)).rejects.toThrow("sentinel");
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it("reuses layer-acquired client and finite model handles across generates", async () => {
    let clientCreations = 0;
    let modelAcquisitions = 0;
    let requestCalls = 0;
    let keyReads = 0;
    const requestedModels: string[] = [];
    const requestModels: object[] = [];
    const flashModel = {
      generateContent: (
        _request: Parameters<typeof generateContentWithSignal>[1],
        _options?: { readonly signal?: AbortSignal },
      ) => {
        requestCalls += 1;
        requestModels.push(flashModel);
        return Promise.reject(new Error("sentinel"));
      },
    };
    const proModel = {
      generateContent: (
        _request: Parameters<typeof generateContentWithSignal>[1],
        _options?: { readonly signal?: AbortSignal },
      ) => Promise.reject(new Error("sentinel")),
    };
    const createClient = () => {
      clientCreations += 1;
      return {
        getGenerativeModel: ({ model }: { readonly model: string }) => {
          modelAcquisitions += 1;
          requestedModels.push(model);
          return model === FLASH_MODEL ? flashModel : proModel;
        },
      };
    };
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: undefined,
        geminiApiKey: Redacted.make("gemini-secret"),
        nodeEnvironment: "test",
        requireAdminPassword: () =>
          Effect.fail(new ConfigurationError({ key: "ADMIN_PASSWORD" })),
        requireGeminiApiKey: () => {
          keyReads += 1;
          return Effect.succeed(Redacted.make("gemini-secret"));
        },
      }),
    );
    const gemini = makeLayer(createClient).pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Gemini;
      const first = yield* Effect.result(
        service.generate(FLASH_MODEL, "first prompt"),
      );
      const second = yield* Effect.result(
        service.generate(FLASH_MODEL, "second prompt"),
      );
      return { first, second };
    }).pipe(Effect.provide(gemini));

    const result = await Effect.runPromise(program);

    expect(clientCreations).toBe(1);
    expect(keyReads).toBe(1);
    expect(modelAcquisitions).toBe(2);
    expect(requestedModels).toEqual([FLASH_MODEL, PRO_MODEL]);
    expect(requestCalls).toBe(2);
    expect(requestModels).toEqual([flashModel, flashModel]);
    expect(result.first._tag).toBe("Failure");
    expect(result.second._tag).toBe("Failure");
  });

  it("keeps missing Gemini configuration typed at generation time", async () => {
    let clientCreations = 0;
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: undefined,
        geminiApiKey: undefined,
        nodeEnvironment: "test",
        requireAdminPassword: () =>
          Effect.fail(new ConfigurationError({ key: "ADMIN_PASSWORD" })),
        requireGeminiApiKey: () =>
          Effect.fail(new ConfigurationError({ key: "GEMINI_API_KEY" })),
      }),
    );
    const gemini = makeLayer(() => {
      clientCreations += 1;
      throw new Error("client should not be acquired");
    }).pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Gemini;
      return yield* Effect.result(service.generate(FLASH_MODEL, "prompt"));
    }).pipe(Effect.provide(gemini));

    const result = await Effect.runPromise(program);
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(ConfigurationError);
    }
    expect(clientCreations).toBe(0);
  });

  it("retains provider operation evidence when client acquisition fails", async () => {
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: undefined,
        geminiApiKey: Redacted.make("gemini-secret"),
        nodeEnvironment: "test",
        requireAdminPassword: () =>
          Effect.fail(new ConfigurationError({ key: "ADMIN_PASSWORD" })),
        requireGeminiApiKey: () =>
          Effect.succeed(Redacted.make("gemini-secret")),
      }),
    );
    const gemini = makeLayer(() => {
      throw new Error("acquisition sentinel");
    }).pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      yield* Gemini;
    }).pipe(Effect.provide(gemini));

    const failure = Effect.runPromise(program);
    await expect(failure).rejects.toMatchObject({
      operation: "Gemini.acquire",
    });
    await expect(failure).rejects.toBeInstanceOf(ProviderError);
  });
});
