import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { responseForError, runRoute } from "@/lib/effect/http";
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
  runRoute(dataEffect.pipe(Effect.provide(Layer.succeed(Dashboard, service))));

describe("admin export data Effect route workflow", () => {
  it("returns vocabulary and readings from the Dashboard service", async () => {
    const response = await runData(
      dashboard(() =>
        Effect.succeed({
          vocabulary: { entries: [] },
          readings: [],
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      vocabulary: { entries: [] },
      readings: [],
    });
  });

  it("maps a Dashboard persistence failure through the shared HTTP boundary", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getData",
      cause: new Error("d1 unavailable"),
    });
    const response = await runData(dashboard(() => Effect.fail(failure)));

    expect(response.status).toBe(503);
    expect(responseForError(failure)?.status).toBe(503);
  });
});
