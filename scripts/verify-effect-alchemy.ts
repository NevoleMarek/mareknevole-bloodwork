import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { readOpenNextCacheEntries } from "@/lib/opennext-cache";
import { OPENNEXT_WORKER_MODULE_GLOBS } from "@/lib/opennext-worker-bundle";

const root = process.cwd();
const stack = read("alchemy.run.ts");
const lockfile = read("bun.lock");
const packageJson = read("package.json");

assert(
  !existsSync(resolve(root, "wrangler.jsonc")),
  "wrangler.jsonc was removed",
);
assertFile(".open-next/worker.js");
assertDirectory(".open-next/assets");
assert(
  readdirSync(resolve(root, ".open-next/assets")).length > 0,
  ".open-next/assets is not empty",
);

for (const text of [
  '"BloodworkStack"',
  'stage === "prod"',
  "name: production.workerName",
  "domain: production.domain",
  "name: production.databaseName",
  "title: production.kvTitle",
  'main: ".open-next/worker.js"',
  'outdir: ".open-next/assets"',
  "bundle: false",
  'command: "bun run build:production-worker"',
  'date: "2025-12-01"',
  '"nodejs_compat"',
  "return { url: site.url }",
]) {
  assert(stack.includes(text), `missing ${text}`);
}

for (const text of [
  'Config.string("CLOUDFLARE_ACCOUNT_ID")',
  "OPENNEXT_CACHE_D1_ID: database.databaseId",
  "OPENNEXT_CACHE_KV_ID: incrementalCache.namespaceId",
  "rules: openNextWorkerModuleRules",
]) {
  assert(stack.includes(text), `missing ${text}`);
}
assert(read(".gitignore").includes(".alchemy/"), ".alchemy is ignored");
assert(
  !packageJson.includes("opennextjs-cloudflare deploy"),
  "OpenNext deploy does not own production publication",
);
assert(
  read("lib/build-production-opennext.ts").includes('"seed:opennext-cache"'),
  "Alchemy's build command seeds the OpenNext cache",
);
assert(
  read("scripts/seed-opennext-cache.ts").includes("OPENNEXT_TAG_CACHE_SCHEMA"),
  "cache seeder initializes the D1 tag table",
);

for (const [binding, value] of [
  ["DB", "database"],
  ["NEXT_TAG_CACHE_D1", "database"],
  ["NEXT_INC_CACHE_KV", "incrementalCache"],
  ["ADMIN_PASSWORD", 'Config.redacted("ADMIN_PASSWORD")'],
  ["GEMINI_API_KEY", 'Config.redacted("GEMINI_API_KEY")'],
] as const) {
  assert(
    count(stack, `${binding}:`) === 1,
    `${binding} is declared exactly once`,
  );
  assert(stack.includes(`${binding}: ${value}`), `${binding} has its binding`);
}

assert(
  count(stack, "Cloudflare.D1.Database") === 1,
  "the D1 database is declared once",
);
assert(
  count(stack, "Cloudflare.KV.Namespace") === 1,
  "the KV namespace is declared once",
);
for (const dependency of [
  '"alchemy": "2.0.0-beta.65"',
  '"effect": "4.0.0-beta.102"',
  '"@effect/platform-bun": "4.0.0-beta.102"',
  '"@effect/platform-node": "4.0.0-beta.102"',
]) {
  assert(lockfile.includes(dependency), `lockfile pins ${dependency}`);
}

const cacheEntries = readOpenNextCacheEntries();
assert(cacheEntries.length > 0, "OpenNext emitted cache entries");
assert(
  cacheEntries.some((entry) => entry.route === "/admin"),
  "OpenNext cache includes the admin prerender",
);
assert(
  cacheEntries.every((entry) => entry.route !== "/"),
  "the force-dynamic dashboard has no build-time cache entry",
);

const modules = workerModules(".open-next");
const moduleBytes = modules.reduce(
  (total, path) => total + statSync(resolve(root, ".open-next", path)).size,
  0,
);
assert(
  modules.length === 10,
  "the Worker module rules contain the ten OpenNext runtime dependencies",
);
assert(
  modules.every((path) => !/[?*{}[\]]/.test(path)),
  "the Worker module rules use literal paths",
);
assert(
  moduleBytes < 64 * 1024 * 1024,
  "the uncompressed Worker module selection is below Cloudflare's 64 MiB limit",
);

console.log(
  `Effect Alchemy deployment contract verified. ${cacheEntries.length} cache entries and ${modules.length} Worker modules (${moduleBytes} bytes).`,
);

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function assertFile(path: string) {
  const target = resolve(root, path);
  assert(existsSync(target) && statSync(target).isFile(), `${path} exists`);
}

function assertDirectory(path: string) {
  const target = resolve(root, path);
  assert(
    existsSync(target) && statSync(target).isDirectory(),
    `${path} exists`,
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Migration contract failed: ${message}`);
}

function count(value: string, needle: string) {
  return value.split(needle).length - 1;
}

function workerModules(outputDir: string) {
  for (const path of OPENNEXT_WORKER_MODULE_GLOBS) {
    assertFile(`${outputDir}/${path}`);
  }
  return [...OPENNEXT_WORKER_MODULE_GLOBS].sort();
}
