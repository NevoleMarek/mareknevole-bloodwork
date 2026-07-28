import { describe, expect, it } from "vitest";

import { buildProductionOpenNext } from "@/lib/build-production-opennext";

describe("buildProductionOpenNext", () => {
  it("seeds the OpenNext cache only after a successful worker build", async () => {
    const calls: string[] = [];
    const exitCode = await buildProductionOpenNext(async (script) => {
      calls.push(script);
      return 0;
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual(["build:worker", "seed:opennext-cache"]);
  });

  it("does not seed when the worker build fails", async () => {
    const calls: string[] = [];
    const exitCode = await buildProductionOpenNext(async (script) => {
      calls.push(script);
      return 1;
    });

    expect(exitCode).toBe(1);
    expect(calls).toEqual(["build:worker"]);
  });
});
