import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import {
  NotFoundError,
  PersistenceError,
  RequestDecodeError,
} from "@/lib/effect/errors";
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

const run = (key: string, service: Dashboard["Service"]) =>
  Effect.runPromise(
    trendEffect(key).pipe(Effect.provide(Layer.succeed(Dashboard, service))),
  );

describe("public biomarker trend Effect workflow", () => {
  it("rejects unknown keys before loading a trend", async () => {
    let trendCalls = 0;
    await expect(
      run(
        "random-cache-key",
        dashboard(
          () => Effect.succeed(["glucose"]),
          () => {
            trendCalls += 1;
            return Effect.succeed([]);
          },
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(trendCalls).toBe(0);
  });

  it("returns points for a visible biomarker", async () => {
    const points: BiomarkerTrendPoint[] = [{ date: "2026-01-01", value: 90 }];
    let requestedKey: string | undefined;
    const result = await run(
      "glucose",
      dashboard(
        () => Effect.succeed(["glucose"]),
        (key) => {
          requestedKey = key;
          return Effect.succeed(points);
        },
      ),
    );

    expect(result).toEqual({ points });
    expect(requestedKey).toBe("glucose");
  });

  it("classifies an empty key as a typed request failure", async () => {
    await expect(
      run(
        "",
        dashboard(
          () => Effect.die("Dashboard must not be called"),
          () => Effect.die("Dashboard must not be called"),
        ),
      ),
    ).rejects.toBeInstanceOf(RequestDecodeError);
  });

  it("preserves persistence failures", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getTrend",
      cause: new Error("d1 unavailable"),
    });
    await expect(
      run(
        "glucose",
        dashboard(
          () => Effect.succeed(["glucose"]),
          () => Effect.fail(failure),
        ),
      ),
    ).rejects.toBe(failure);
  });
});
