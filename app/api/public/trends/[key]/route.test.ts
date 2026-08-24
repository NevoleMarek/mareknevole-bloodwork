import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { runRoute } from "@/lib/effect/http";
import { Dashboard } from "@/lib/effect/services";
import { trendEffect } from "@/lib/effect/workflows";
import type { BiomarkerTrendPoint } from "@/types/bloodwork";

const unused = () => Effect.die("unused dashboard operation");

const dashboard = (
  getVisibleKeys: Dashboard["Service"]["getVisibleKeys"],
  getTrend: Dashboard["Service"]["getTrend"],
) =>
  Dashboard.of({
    getDashboard: unused,
    getData: unused,
    getTrend,
    getVisibleKeys,
    getHealth: unused,
    getFirstChangelogPage: unused,
    getChangelogPage: unused,
    getReadingPage: unused,
  });

const runTrend = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  service: Layer.Layer<R, never, never>,
) => runRoute(effect.pipe(Effect.provide(service)));

describe("public biomarker trend Effect route workflow", () => {
  it("rejects unknown keys before creating a trend cache entry", async () => {
    let trendCalls = 0;
    const response = await runTrend(
      trendEffect(Promise.resolve({ key: "random-cache-key" })),
      Layer.succeed(
        Dashboard,
        dashboard(
          () => Effect.succeed(["glucose"]),
          () => {
            trendCalls += 1;
            return Effect.succeed([]);
          },
        ),
      ),
    );

    expect(response.status).toBe(404);
    expect(trendCalls).toBe(0);
  });

  it("returns points for a visible biomarker", async () => {
    const points: BiomarkerTrendPoint[] = [{ date: "2026-01-01", value: 90 }];
    let requestedKey: string | undefined;
    const response = await runTrend(
      trendEffect(Promise.resolve({ key: "glucose" })),
      Layer.succeed(
        Dashboard,
        dashboard(
          () => Effect.succeed(["glucose"]),
          (key) => {
            requestedKey = key;
            return Effect.succeed(points);
          },
        ),
      ),
    );

    expect(await response.json()).toEqual({ points });
    expect(requestedKey).toBe("glucose");
  });

  it("classifies an empty key as a typed 400 request failure", async () => {
    const response = await runTrend(
      trendEffect(Promise.resolve({ key: "" })),
      Layer.succeed(
        Dashboard,
        dashboard(
          () => Effect.die("Dashboard must not be called"),
          () => Effect.die("Dashboard must not be called"),
        ),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("preserves framework params rejection as a defect instead of turning it into 404", async () => {
    const frameworkFailure = new Error("framework params unavailable");
    const effect = trendEffect(Promise.reject(frameworkFailure)).pipe(
      Effect.provide(
        Layer.succeed(
          Dashboard,
          dashboard(
            () => Effect.die("Dashboard must not be called"),
            () => Effect.die("Dashboard must not be called"),
          ),
        ),
      ),
    );

    await expect(runRoute(effect)).rejects.toThrow(
      "framework params unavailable",
    );
  });

  it("maps persistence failures from the trend service to 503", async () => {
    const response = await runTrend(
      trendEffect(Promise.resolve({ key: "glucose" })),
      Layer.succeed(
        Dashboard,
        dashboard(
          () => Effect.succeed(["glucose"]),
          () =>
            Effect.fail(
              new PersistenceError({
                operation: "Dashboard.getTrend",
                cause: new Error("d1 unavailable"),
              }),
            ),
        ),
      ),
    );

    expect(response.status).toBe(503);
  });
});
