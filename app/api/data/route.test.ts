import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { Dashboard } from "@/lib/effect/services";
import { dataEffect } from "@/lib/effect/workflows";

const unused = () => Effect.die("unused dashboard operation");

const dashboard = (getData: Dashboard["Service"]["getData"]) =>
  Dashboard.of({
    getDashboard: unused,
    getData,
    getTrend: unused,
    getVisibleKeys: unused,
    getHealth: unused,
    getFirstChangelogPage: unused,
    getChangelogPage: unused,
    getReadingPage: unused,
  });

const runData = (service: Dashboard["Service"]) =>
  Effect.runPromise(
    dataEffect().pipe(Effect.provide(Layer.succeed(Dashboard, service))),
  );

describe("admin export data Effect workflow", () => {
  it("returns vocabulary and readings from Dashboard", async () => {
    await expect(
      runData(
        dashboard(() =>
          Effect.succeed({ vocabulary: { entries: [] }, readings: [] }),
        ),
      ),
    ).resolves.toEqual({ vocabulary: { entries: [] }, readings: [] });
  });

  it("preserves a Dashboard persistence failure", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getData",
      cause: new Error("d1 unavailable"),
    });
    await expect(runData(dashboard(() => Effect.fail(failure)))).rejects.toBe(
      failure,
    );
  });
});
