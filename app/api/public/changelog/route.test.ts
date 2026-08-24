import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import { PersistenceError, RequestDecodeError } from "@/lib/effect/errors";
import { changelogCursor } from "@/lib/effect/query";
import { Dashboard } from "@/lib/effect/services";
import { changelogEffect } from "@/lib/effect/workflows";
import type { ChangelogCursor, ChangelogPage } from "@/types/bloodwork";

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

const run = (cursor: ChangelogCursor | null, service: Dashboard["Service"]) =>
  Effect.runPromise(
    changelogEffect(cursor).pipe(
      Effect.provide(Layer.succeed(Dashboard, service)),
    ),
  );

describe("public changelog Effect workflow", () => {
  it("loads the first page without a cursor", async () => {
    let firstPageCalls = 0;
    const result = await run(
      null,
      dashboard(
        () => {
          firstPageCalls += 1;
          return Effect.succeed(page);
        },
        () => Effect.die("cursor page must not be called"),
      ),
    );

    expect(result).toEqual(page);
    expect(firstPageCalls).toBe(1);
  });

  it("rejects a partial cursor before calling Dashboard", async () => {
    await expect(
      Effect.runPromise(changelogCursor({ date: "2026-01-01" })),
    ).rejects.toBeInstanceOf(RequestDecodeError);
  });

  it("keeps an empty persisted cursor date", async () => {
    const cursor = await Effect.runPromise(
      changelogCursor({
        date: "",
        createdAt: "2026-01-01T10:00:00Z",
        id: "c1",
      }),
    );
    let cursorDate: string | undefined;
    await run(
      cursor,
      dashboard(
        () => Effect.die("first page must not be called"),
        (received) => {
          cursorDate = received?.date;
          return Effect.succeed(page);
        },
      ),
    );

    expect(cursorDate).toBe("");
  });

  it("preserves persistence failures", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getFirstChangelogPage",
      cause: new Error("d1 unavailable"),
    });
    await expect(
      run(
        null,
        dashboard(
          () => Effect.fail(failure),
          () => Effect.die("cursor page must not be called"),
        ),
      ),
    ).rejects.toBe(failure);
  });
});
