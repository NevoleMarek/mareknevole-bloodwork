import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { runRoute } from "@/lib/effect/http";
import { Dashboard } from "@/lib/effect/services";
import { changelogEffect } from "@/lib/effect/workflows";
import type { ChangelogPage } from "@/types/bloodwork";

const unused = () => Effect.die("unused dashboard operation");

const dashboard = (
  getFirstChangelogPage: Dashboard["Service"]["getFirstChangelogPage"],
  getChangelogPage: Dashboard["Service"]["getChangelogPage"],
) =>
  Dashboard.of({
    getDashboard: unused,
    getData: unused,
    getTrend: unused,
    getVisibleKeys: unused,
    getHealth: unused,
    getFirstChangelogPage,
    getChangelogPage,
    getReadingPage: unused,
  });

const page: ChangelogPage = { entries: [], nextCursor: null };

const runChangelog = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  service: Layer.Layer<R, never, never>,
) => runRoute(effect.pipe(Effect.provide(service)));

describe("public changelog Effect route workflow", () => {
  it("loads the first page through Dashboard without a cursor", async () => {
    let firstPageCalls = 0;
    const service = dashboard(
      () => {
        firstPageCalls += 1;
        return Effect.succeed(page);
      },
      () => Effect.die("cursor page must not be called"),
    );

    const response = await runChangelog(
      changelogEffect(
        new Request("https://bloodwork.test/api/public/changelog"),
      ),
      Layer.succeed(Dashboard, service),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
    expect(firstPageCalls).toBe(1);
  });

  it("rejects a partial cursor before calling Dashboard", async () => {
    const response = await runChangelog(
      changelogEffect(
        new Request(
          "https://bloodwork.test/api/public/changelog?date=2026-01-01",
        ),
      ),
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

  it("loads a complete cursor, including an empty persisted date", async () => {
    let cursorDate: string | undefined;
    const service = dashboard(
      () => Effect.die("first page must not be called"),
      (cursor) => {
        if (cursor === null) return Effect.die("cursor must be present");
        cursorDate = cursor.date;
        return Effect.succeed(page);
      },
    );

    const response = await runChangelog(
      changelogEffect(
        new Request(
          "https://bloodwork.test/api/public/changelog?date=&createdAt=2026-01-01T10%3A00%3A00Z&id=c1",
        ),
      ),
      Layer.succeed(Dashboard, service),
    );

    expect(response.status).toBe(200);
    expect(cursorDate).toBe("");
  });

  it("maps persistence failures from the current Dashboard workflow", async () => {
    const response = await runChangelog(
      changelogEffect(
        new Request("https://bloodwork.test/api/public/changelog"),
      ),
      Layer.succeed(
        Dashboard,
        dashboard(
          () =>
            Effect.fail(
              new PersistenceError({
                operation: "Dashboard.getFirstChangelogPage",
                cause: new Error("d1 unavailable"),
              }),
            ),
          () => Effect.die("cursor page must not be called"),
        ),
      ),
    );

    expect(response.status).toBe(503);
  });
});
