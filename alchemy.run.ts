import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

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
    const site = yield* Cloudflare.Website.StaticSite("BloodworkSite", {
      ...(isProduction ? { domain: production.domain } : {}),
      ...(isProduction ? { name: production.workerName } : {}),
      bundle: false,
      command: "bun run build:production-worker",
      compatibility: {
        date: "2025-12-01",
        flags: ["nodejs_compat"],
      },
      env: {
        ADMIN_PASSWORD: Config.redacted("ADMIN_PASSWORD"),
        DB: database,
        GEMINI_API_KEY: Config.redacted("GEMINI_API_KEY"),
        NEXT_INC_CACHE_KV: incrementalCache,
        NEXT_TAG_CACHE_D1: database,
        OPENNEXT_CACHE_ACCOUNT_ID: Config.string("CLOUDFLARE_ACCOUNT_ID"),
        OPENNEXT_CACHE_D1_ID: database.databaseId,
        OPENNEXT_CACHE_KV_ID: incrementalCache.namespaceId,
      },
      main: ".open-next/worker.js",
      outdir: ".open-next/assets",
      rules: openNextWorkerModuleRules,
    });

    return { url: site.url };
  }),
);
