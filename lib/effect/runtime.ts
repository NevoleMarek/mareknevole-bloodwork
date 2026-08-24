import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { PersistenceError } from "@/lib/effect/errors";

export interface CloudflareRuntimeContext {
  readonly env: CloudflareEnv;
  readonly ctx: ExecutionContext;
}

/** The one application adapter allowed to read OpenNext's request context. */
export class CloudflareRuntime extends Context.Service<
  CloudflareRuntime,
  CloudflareRuntimeContext
>()("Bloodwork/CloudflareRuntime") {}

export const layer = Layer.effect(
  CloudflareRuntime,
  Effect.tryPromise({
    try: () => getCloudflareContext({ async: true }),
    catch: (cause) =>
      new PersistenceError({
        operation: "CloudflareRuntime.readContext",
        cause,
      }),
  }).pipe(Effect.map(({ env, ctx }) => CloudflareRuntime.of({ env, ctx }))),
);

/** Promise bridge for Next server components and framework adapters. */
export const readCloudflareEnv = async (): Promise<CloudflareEnv> =>
  (await getCloudflareContext({ async: true })).env;
