import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import {
  NotFoundError,
  PersistenceError,
  RequestDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { runRoute } from "@/lib/effect/http";
import { Bloodwork, Dashboard } from "@/lib/effect/services";
import {
  deleteReadingEffect,
  getReadingsEffect,
  saveReadingEffect,
} from "@/lib/effect/workflows";
import type { ReadingCursor, ReadingPage } from "@/types/bloodwork";

const unused = () => Effect.die("unused service operation");

const dashboard = (getReadingPage: Dashboard["Service"]["getReadingPage"]) =>
  Dashboard.of({
    getDashboard: unused,
    getData: unused,
    getTrend: unused,
    getVisibleKeys: unused,
    getHealth: unused,
    getFirstChangelogPage: unused,
    getChangelogPage: unused,
    getReadingPage,
  });

const bloodwork = (
  saveReading: Bloodwork["Service"]["saveReading"],
  deleteReading: Bloodwork["Service"]["deleteReading"],
) =>
  Bloodwork.of({
    getVocabulary: unused,
    saveReading,
    deleteReading,
    createVocabulary: unused,
    updateVocabulary: unused,
    deleteVocabulary: unused,
  });

const page: ReadingPage = { entries: [], nextCursor: null };

const runReading = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  services: Layer.Layer<R, never, never>,
) => runRoute(effect.pipe(Effect.provide(services)));

describe("readings Effect route workflows", () => {
  it("loads the first page through Dashboard without a cursor", async () => {
    let receivedCursor: ReadingCursor | null | undefined;
    const service = dashboard((cursor) => {
      receivedCursor = cursor;
      return Effect.succeed(page);
    });

    const response = await runReading(
      getReadingsEffect(new Request("https://bloodwork.test/api/readings")),
      Layer.succeed(Dashboard, service),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
    expect(receivedCursor).toBeNull();
  });

  it("rejects a partial cursor before calling Dashboard", async () => {
    const response = await runReading(
      getReadingsEffect(
        new Request("https://bloodwork.test/api/readings?date=2026-01-01"),
      ),
      Layer.succeed(
        Dashboard,
        dashboard(() => Effect.die("Dashboard must not be called")),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("loads a complete cursor, including an intentionally empty persisted date", async () => {
    let receivedCursor: ReadingCursor | null | undefined;
    const service = dashboard((cursor) => {
      receivedCursor = cursor;
      return Effect.succeed(page);
    });

    const response = await runReading(
      getReadingsEffect(
        new Request("https://bloodwork.test/api/readings?date=&id=r1"),
      ),
      Layer.succeed(Dashboard, service),
    );

    expect(response.status).toBe(200);
    expect(receivedCursor).toEqual({ date: "", id: "r1" });
  });

  it("maps persistence failures from the current Dashboard workflow", async () => {
    const response = await runReading(
      getReadingsEffect(new Request("https://bloodwork.test/api/readings")),
      Layer.succeed(
        Dashboard,
        dashboard(() =>
          Effect.fail(
            new PersistenceError({
              operation: "Dashboard.getReadingPage",
              cause: new Error("d1 unavailable"),
            }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(503);
  });

  it("decodes POST bodies and invokes Bloodwork", async () => {
    let receivedDate: string | undefined;
    const response = await runReading(
      saveReadingEffect(
        new Request("https://bloodwork.test/api/readings", {
          method: "POST",
          body: JSON.stringify({
            date: "2026-01-01",
            source: "lab",
            measurements: [],
            newVocabulary: [],
          }),
          headers: { "content-type": "application/json" },
        }),
      ),
      Layer.succeed(
        Bloodwork,
        bloodwork((request) => {
          receivedDate = request.date;
          return Effect.succeed("reading-1");
        }, unused),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ readingId: "reading-1" });
    expect(receivedDate).toBe("2026-01-01");
  });

  it("maps malformed POST JSON to a typed 400 response", async () => {
    const response = await runReading(
      saveReadingEffect(
        new Request("https://bloodwork.test/api/readings", {
          method: "POST",
          body: "{",
          headers: { "content-type": "application/json" },
        }),
      ),
      Layer.succeed(
        Bloodwork,
        bloodwork(() => Effect.die("Bloodwork must not be called"), unused),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("maps repository validation for empty measurements to 400", async () => {
    const response = await runReading(
      saveReadingEffect(
        new Request("https://bloodwork.test/api/readings", {
          method: "POST",
          body: JSON.stringify({
            date: "2026-01-01",
            source: "lab",
            measurements: [],
            newVocabulary: [],
          }),
          headers: { "content-type": "application/json" },
        }),
      ),
      Layer.succeed(
        Bloodwork,
        bloodwork(
          () =>
            Effect.fail(
              new ValidationError({
                operation: "Repository.saveReading",
                message: "At least one measurement is required",
              }),
            ),
          unused,
        ),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("maps a missing reading mutation to 404", async () => {
    const response = await runReading(
      deleteReadingEffect(
        new Request("https://bloodwork.test/api/readings", {
          method: "DELETE",
          body: JSON.stringify({ id: "missing" }),
          headers: { "content-type": "application/json" },
        }),
      ),
      Layer.succeed(
        Bloodwork,
        bloodwork(unused, () =>
          Effect.fail(
            new NotFoundError({ resource: "reading", id: "missing" }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(404);
  });

  it("keeps request errors typed instead of treating them as defects", async () => {
    const effect = saveReadingEffect(
      new Request("https://bloodwork.test/api/readings", {
        method: "POST",
        body: "null",
        headers: { "content-type": "application/json" },
      }),
    ).pipe(Effect.provide(Layer.succeed(Bloodwork, bloodwork(unused, unused))));

    await expect(Effect.runPromise(effect)).rejects.toBeInstanceOf(
      RequestDecodeError,
    );
  });
});
