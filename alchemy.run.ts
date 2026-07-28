import * as Alchemy from "alchemy";
import * as Command from "alchemy/Command";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Namespace from "alchemy/Namespace";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import { cast } from "effect/Function";

import { openNextWorkerModuleRules } from "@/lib/opennext-worker-bundle";

const production = {
  databaseName: "bloodwork-db",
  domain: "bloodwork.mareknevole.com",
  kvTitle: "NEXT_INC_CACHE_KV",
  workerName: "bloodwork",
};

export default Alchemy.Stack(
  "BloodworkStack",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const isProduction = (yield* Alchemy.Stack).stage === "prod";
    const database = yield* Cloudflare.D1.Database(
      "BloodworkDatabase",
      isProduction ? { name: production.databaseName } : {},
    );
    const incrementalCache = yield* Cloudflare.KV.Namespace(
      "NextIncrementalCache",
      isProduction ? { title: production.kvTitle } : {},
    );

    const buildEnv = {
      CLOUDFLARE_ACCOUNT_ID: Config.string("CLOUDFLARE_ACCOUNT_ID"),
      CLOUDFLARE_API_TOKEN: Config.redacted("CLOUDFLARE_API_TOKEN"),
      OPENNEXT_CACHE_ACCOUNT_ID: Config.string("CLOUDFLARE_ACCOUNT_ID"),
      OPENNEXT_CACHE_D1_ID: database.databaseId,
      OPENNEXT_CACHE_KV_ID: incrementalCache.namespaceId,
    };
    const workerEnv = {
      ADMIN_PASSWORD: Config.redacted("ADMIN_PASSWORD"),
      DB: database,
      GEMINI_API_KEY: Config.redacted("GEMINI_API_KEY"),
      NEXT_INC_CACHE_KV: incrementalCache,
      NEXT_TAG_CACHE_D1: database,
    };

    const worker = yield* Effect.gen(function* () {
      const build = yield* Command.Build("Build", {
        command: "bun run build:production-worker",
        env: buildEnv,
        outdir: ".open-next/assets",
      });

      return yield* Cloudflare.Worker("Worker", {
        ...(isProduction ? { domain: production.domain } : {}),
        ...(isProduction ? { name: production.workerName } : {}),
        assets: cast({
          directory: build.outdir,
          hash: build.hash.output,
        }),
        bundle: false,
        compatibility: {
          date: "2025-12-01",
          flags: ["nodejs_compat"],
        },
        env: workerEnv,
        main: ".open-next/worker.js",
        rules: openNextWorkerModuleRules,
      });
    }).pipe(Namespace.push("BloodworkSite"));

    return { url: worker.url };
  }),
);
