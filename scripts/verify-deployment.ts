import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { readOpenNextCacheEntries } from "@/lib/opennext-cache";

const root = process.cwd();
assertFile(".open-next/worker.js");
assertDirectory(".open-next/assets");
assert(
  readdirSync(resolve(root, ".open-next/assets")).length > 0,
  ".open-next/assets is not empty",
);

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

assertFile(".open-next/server-functions/default/handler.mjs");

console.log(
  `Deployment artifacts verified. ${cacheEntries.length} cache entries and a bundled OpenNext Worker.`,
);

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

function assert(condition: boolean, message: string): asserts condition {
  if (!condition)
    throw new Error(`Deployment artifact check failed: ${message}`);
}
