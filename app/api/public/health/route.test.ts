import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { runRoute } from "@/lib/effect/http";
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

const runHealth = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  service: Layer.Layer<R, never, never>,
) => runRoute(effect.pipe(Effect.provide(service)));

describe("public health Effect route workflow", () => {
  it("rejects an invalid period as a typed 400", async () => {
    const response = await runHealth(
      healthEffect(
        new Request("https://bloodwork.test/api/public/health?period=forever"),
      ),
      Layer.succeed(
        Dashboard,
        dashboard(() => Effect.die("Dashboard must not be called")),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns the selected period from Dashboard", async () => {
    let selectedPeriod: string | undefined;
    const service = dashboard((period) => {
      selectedPeriod = period;
      return Effect.succeed(health);
    });
    const response = await runHealth(
      healthEffect(
        new Request("https://bloodwork.test/api/public/health?period=1Y"),
      ),
      Layer.succeed(Dashboard, service),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(health);
    expect(selectedPeriod).toBe("1Y");
  });

  it("maps persistence failures from Dashboard to 503", async () => {
    const response = await runHealth(
      healthEffect(
        new Request("https://bloodwork.test/api/public/health?period=1Y"),
      ),
      Layer.succeed(
        Dashboard,
        dashboard(() =>
          Effect.fail(
            new PersistenceError({
              operation: "Dashboard.getHealth",
              cause: new Error("d1 unavailable"),
            }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(503);
  });
});
