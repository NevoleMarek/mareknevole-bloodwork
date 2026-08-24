import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { ConfigurationError } from "@/lib/effect/errors";
import { CloudflareRuntime } from "@/lib/effect/runtime";

const RuntimeConfigSchema = Schema.Struct({
  adminPassword: Schema.optional(Schema.String),
  geminiApiKey: Schema.optional(Schema.String),
  nodeEnvironment: Schema.optional(Schema.String),
});

export interface ApplicationConfigContract {
  readonly adminPassword: string | undefined;
  readonly geminiApiKey: string | undefined;
  readonly nodeEnvironment: string | undefined;
  readonly requireAdminPassword: () => Effect.Effect<
    string,
    ConfigurationError
  >;
  readonly requireGeminiApiKey: () => Effect.Effect<string, ConfigurationError>;
}

export class ApplicationConfig extends Context.Service<
  ApplicationConfig,
  ApplicationConfigContract
>()("Bloodwork/ApplicationConfig") {}

export const layer = Layer.effect(
  ApplicationConfig,
  Effect.gen(function* () {
    const runtime = yield* CloudflareRuntime;
    const decoded = yield* Schema.decodeUnknownEffect(RuntimeConfigSchema)({
      adminPassword: runtime.env.ADMIN_PASSWORD,
      geminiApiKey: runtime.env.GEMINI_API_KEY,
      nodeEnvironment: runtime.env.NEXTJS_ENV,
    }).pipe(
      Effect.mapError(
        () => new ConfigurationError({ key: "Cloudflare bindings" }),
      ),
    );

    const requireValue = (value: string | undefined, key: string) =>
      value === undefined || value.length === 0
        ? Effect.fail(new ConfigurationError({ key }))
        : Effect.succeed(value);

    return ApplicationConfig.of({
      adminPassword: decoded.adminPassword,
      geminiApiKey: decoded.geminiApiKey,
      nodeEnvironment: decoded.nodeEnvironment,
      requireAdminPassword: () =>
        requireValue(decoded.adminPassword, "ADMIN_PASSWORD"),
      requireGeminiApiKey: () =>
        requireValue(decoded.geminiApiKey, "GEMINI_API_KEY"),
    });
  }),
);
