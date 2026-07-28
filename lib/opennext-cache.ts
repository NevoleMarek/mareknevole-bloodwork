import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const OPENNEXT_TAG_CACHE_SCHEMA =
  "CREATE TABLE IF NOT EXISTS revalidations (tag TEXT NOT NULL, revalidatedAt INTEGER NOT NULL, UNIQUE(tag) ON CONFLICT REPLACE);";

export type OpenNextCacheEntry = {
  key: string;
  route: string;
  value: string;
};

export function readOpenNextCacheEntries(outputDir = ".open-next") {
  const cacheDir = resolve(outputDir, "cache");
  return files(cacheDir)
    .sort()
    .map((file) => {
      const assetPath = relative(cacheDir, file).split(sep).join("/");
      const { buildId, cacheType, route } = parseCacheAssetPath(assetPath);
      return {
        key: cacheKey(route, buildId, cacheType),
        route,
        value: readFileSync(file, "utf8"),
      } satisfies OpenNextCacheEntry;
    });
}

function cacheKey(
  route: string,
  buildId: string,
  cacheType: "cache" | "fetch",
) {
  const hash = createHash("sha256").update(route).digest("hex");
  return `incremental-cache/${buildId}/${hash}.${cacheType}`;
}

function parseCacheAssetPath(assetPath: string) {
  if (assetPath.startsWith("__fetch/")) {
    const [, buildId, ...routeParts] = assetPath.split("/");
    if (!buildId || routeParts.length === 0) {
      throw new Error(`Invalid OpenNext fetch cache path: ${assetPath}`);
    }
    return {
      buildId,
      cacheType: "fetch" as const,
      route: `/${routeParts.join("/")}`,
    };
  }

  if (!assetPath.endsWith(".cache")) {
    throw new Error(`Invalid OpenNext cache path: ${assetPath}`);
  }
  const [buildId, ...routeParts] = assetPath
    .slice(0, -".cache".length)
    .split("/");
  if (!buildId || routeParts.length === 0) {
    throw new Error(`Invalid OpenNext cache path: ${assetPath}`);
  }
  return {
    buildId,
    cacheType: "cache" as const,
    route: `/${routeParts.join("/")}`,
  };
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
