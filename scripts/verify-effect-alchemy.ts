import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const stack = read("alchemy.run.ts");
const lockfile = read("bun.lock");

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
  'date: "2025-12-01"',
  '"nodejs_compat"',
  "return { url: site.url }",
]) {
  assert(stack.includes(text), `missing ${text}`);
}

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

console.log("Effect Alchemy deployment contract verified.");

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
