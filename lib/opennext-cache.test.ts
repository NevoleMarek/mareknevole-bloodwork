import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { readOpenNextCacheEntries } from "@/lib/opennext-cache";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("readOpenNextCacheEntries", () => {
  it("matches OpenNext cache paths to the runtime KV keys", () => {
    const outputDir = temporaryOutput();
    writeCache(outputDir, "cache/build-123/admin.cache", "admin payload");
    writeCache(
      outputDir,
      "cache/__fetch/build-123/api/weather?city=Prague",
      "weather payload",
    );

    expect(readOpenNextCacheEntries(outputDir)).toEqual([
      {
        key: cacheKey("/api/weather?city=Prague", "build-123", "fetch"),
        route: "/api/weather?city=Prague",
        value: "weather payload",
      },
      {
        key: cacheKey("/admin", "build-123", "cache"),
        route: "/admin",
        value: "admin payload",
      },
    ]);
  });
});

function temporaryOutput() {
  const directory = mkdtempSync(join(tmpdir(), "opennext-cache-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writeCache(outputDir: string, path: string, value: string) {
  const file = join(outputDir, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, value);
}

function cacheKey(
  route: string,
  buildId: string,
  cacheType: "cache" | "fetch",
) {
  const hash = createHash("sha256").update(route).digest("hex");
  return `incremental-cache/${buildId}/${hash}.${cacheType}`;
}
