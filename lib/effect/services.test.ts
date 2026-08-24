import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { ApplicationConfig } from "@/lib/effect/config";
import {
  AuthenticationError,
  ConfigurationError,
  ProviderDecodeError,
} from "@/lib/effect/errors";
import { Gemini } from "@/lib/effect/provider";
import {
  authLayer,
  providerWorkflowsLayer,
  Auth,
  ProviderWorkflows,
} from "@/lib/effect/services";

describe("Effect application services", () => {
  it("keeps missing admin configuration in the typed error channel", async () => {
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
    const auth = authLayer.pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Auth;
      return yield* service.authenticate("secret");
    }).pipe(Effect.provide(auth));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      ConfigurationError,
    );
  });

  it("keeps authentication failures in the typed error channel", async () => {
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: "secret",
        geminiApiKey: undefined,
        nodeEnvironment: "test",
        requireAdminPassword: () => Effect.succeed("secret"),
        requireGeminiApiKey: () =>
          Effect.fail(new ConfigurationError({ key: "GEMINI_API_KEY" })),
      }),
    );
    const auth = authLayer.pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Auth;
      return yield* service.authenticate("wrong");
    }).pipe(Effect.provide(auth));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("classifies a provider response decode failure", async () => {
    const gemini = Layer.succeed(
      Gemini,
      Gemini.of({
        generate: () => Effect.succeed("not-json"),
        decodeJson: <S extends Schema.Top>(
          _schema: S,
          _text: string,
          operation: string,
        ) =>
          Effect.fail(
            new ProviderDecodeError({ operation, cause: "malformed" }),
          ),
      }),
    );
    const workflows = providerWorkflowsLayer.pipe(Layer.provide(gemini));
    const program = Effect.gen(function* () {
      const service = yield* ProviderWorkflows;
      return yield* service.map({
        variables: [{ label: "Glucose", value: 90, unit: "mg/dL" }],
        vocabulary: [],
      });
    }).pipe(Effect.provide(workflows));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      ProviderDecodeError,
    );
  });
});
