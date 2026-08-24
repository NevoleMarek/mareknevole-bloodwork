import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { Dashboard } from "@/lib/effect/services";
import { healthEffect } from "@/lib/effect/workflows";
import type { HealthData } from "@/types/health";

const unused = () => Effect.die("unused dashboard operation");

const dashboard = (getHealth: Dashboard["Service"]["getHealth"]) =>
  Dashboard.of({
    getDashboard: unused,
    getData: unused,
    getTrend: unused,
    getVisibleKeys: unused,
    getHealth,
    getFirstChangelogPage: unused,
    getChangelogPage: unused,
    getReadingPage: unused,
  });

const health: HealthData = { metrics: [], configs: [] };

const run = (service: Dashboard["Service"]) =>
  Effect.runPromise(
    healthEffect("1Y").pipe(Effect.provide(Layer.succeed(Dashboard, service))),
  );

describe("public health Effect workflow", () => {
  it("passes the selected period to Dashboard", async () => {
    let selectedPeriod: string | undefined;
    const result = await run(
      dashboard((period) => {
        selectedPeriod = period;
        return Effect.succeed(health);
      }),
    );

    expect(result).toEqual(health);
    expect(selectedPeriod).toBe("1Y");
  });

  it("preserves Dashboard persistence failures", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getHealth",
      cause: new Error("d1 unavailable"),
    });
    await expect(run(dashboard(() => Effect.fail(failure)))).rejects.toBe(
      failure,
    );
  });
});
