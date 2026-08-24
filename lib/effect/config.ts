import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { CloudflareRuntime } from "@/lib/effect/runtime";
import { ConfigurationError } from "@/lib/effect/errors";

/**
 * Config recipes are evaluated against a provider built from Cloudflare's
 * bindings. Keeping these recipes separate makes the source of authority
 * explicit and lets tests provide a deterministic provider without touching
 * process.env.
 */
const RuntimeConfig = Config.all({
  adminPassword: Config.option(Config.redacted("ADMIN_PASSWORD")),
  geminiApiKey: Config.option(Config.redacted("GEMINI_API_KEY")),
  nodeEnvironment: Config.option(Config.string("NEXTJS_ENV")),
});

const optionValue = <A>(value: Option.Option<A>): A | undefined =>
  Option.isSome(value) ? value.value : undefined;

export interface RuntimeBindings {
  readonly ADMIN_PASSWORD?: unknown;
  readonly GEMINI_API_KEY?: unknown;
  readonly NEXTJS_ENV?: unknown;
}

export const readRuntimeConfig = (bindings: RuntimeBindings) =>
  RuntimeConfig.parse(ConfigProvider.fromUnknown(bindings)).pipe(
    Effect.mapError(
      () => new ConfigurationError({ key: "Cloudflare bindings" }),
    ),
    Effect.map((decoded) => ({
      adminPassword: optionValue(decoded.adminPassword),
      geminiApiKey: optionValue(decoded.geminiApiKey),
      nodeEnvironment: optionValue(decoded.nodeEnvironment),
    })),
  );

export interface ApplicationConfigContract {
  readonly adminPassword: Redacted.Redacted<string> | undefined;
  readonly geminiApiKey: Redacted.Redacted<string> | undefined;
  readonly nodeEnvironment: string | undefined;
  readonly requireAdminPassword: () => Effect.Effect<
    Redacted.Redacted<string>,
    ConfigurationError
  >;
  readonly requireGeminiApiKey: () => Effect.Effect<
    Redacted.Redacted<string>,
    ConfigurationError
  >;
}

export class ApplicationConfig extends Context.Service<
  ApplicationConfig,
  ApplicationConfigContract
>()("Bloodwork/ApplicationConfig") {}

export const layer = Layer.effect(
  ApplicationConfig,
  Effect.gen(function* () {
    const runtime = yield* CloudflareRuntime;
    const decoded = yield* readRuntimeConfig({
      ADMIN_PASSWORD: runtime.env.ADMIN_PASSWORD,
      GEMINI_API_KEY: runtime.env.GEMINI_API_KEY,
      NEXTJS_ENV: runtime.env.NEXTJS_ENV,
    });

    const { adminPassword, geminiApiKey, nodeEnvironment } = decoded;
    const requireValue = <A>(value: A | undefined, key: string) =>
      value === undefined
        ? Effect.fail(new ConfigurationError({ key }))
        : Effect.succeed(value);

    return ApplicationConfig.of({
      adminPassword,
      geminiApiKey,
      nodeEnvironment,
      requireAdminPassword: () => requireValue(adminPassword, "ADMIN_PASSWORD"),
      requireGeminiApiKey: () => requireValue(geminiApiKey, "GEMINI_API_KEY"),
    });
  }),
);
