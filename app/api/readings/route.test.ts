import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";

import {
  NotFoundError,
  PersistenceError,
  RequestDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { readingCursor } from "@/lib/effect/query";
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

const run = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  services: Layer.Layer<R, never, never>,
) => Effect.runPromise(effect.pipe(Effect.provide(services)));

describe("readings Effect workflows", () => {
  it("loads the first page through Dashboard without a cursor", async () => {
    let receivedCursor: ReadingCursor | null | undefined;
    const result = await run(
      getReadingsEffect(null),
      Layer.succeed(
        Dashboard,
        dashboard((cursor) => {
          receivedCursor = cursor;
          return Effect.succeed(page);
        }),
      ),
    );

    expect(result).toEqual(page);
    expect(receivedCursor).toBeNull();
  });

  it("rejects a partial cursor before calling Dashboard", async () => {
    const effect = readingCursor({ date: "2026-01-01" }).pipe(
      Effect.flatMap(getReadingsEffect),
      Effect.provide(
        Layer.succeed(
          Dashboard,
          dashboard(() => Effect.die("Dashboard must not be called")),
        ),
      ),
    );

    await expect(Effect.runPromise(effect)).rejects.toBeInstanceOf(
      RequestDecodeError,
    );
  });

  it("keeps an intentionally empty persisted cursor date", async () => {
    let receivedCursor: ReadingCursor | null | undefined;
    const result = await run(
      readingCursor({ date: "", id: "r1" }).pipe(
        Effect.flatMap(getReadingsEffect),
      ),
      Layer.succeed(
        Dashboard,
        dashboard((cursor) => {
          receivedCursor = cursor;
          return Effect.succeed(page);
        }),
      ),
    );

    expect(result).toEqual(page);
    expect(receivedCursor).toEqual({ date: "", id: "r1" });
  });

  it("keeps persistence failures typed", async () => {
    const failure = new PersistenceError({
      operation: "Dashboard.getReadingPage",
      cause: new Error("d1 unavailable"),
    });
    await expect(
      run(
        getReadingsEffect(null),
        Layer.succeed(
          Dashboard,
          dashboard(() => Effect.fail(failure)),
        ),
      ),
    ).rejects.toBe(failure);
  });

  it("saves a decoded reading request", async () => {
    let receivedDate: string | undefined;
    const result = await run(
      saveReadingEffect({
        date: "2026-01-01",
        source: "lab",
        measurements: [],
        newVocabulary: [],
      }),
      Layer.succeed(
        Bloodwork,
        bloodwork((request) => {
          receivedDate = request.date;
          return Effect.succeed("reading-1");
        }, unused),
      ),
    );

    expect(result).toEqual({ readingId: "reading-1" });
    expect(receivedDate).toBe("2026-01-01");
  });

  it("preserves repository validation failures", async () => {
    const failure = new ValidationError({
      operation: "Repository.saveReading",
      message: "At least one measurement is required",
    });
    await expect(
      run(
        saveReadingEffect({
          date: "2026-01-01",
          source: "lab",
          measurements: [],
          newVocabulary: [],
        }),
        Layer.succeed(
          Bloodwork,
          bloodwork(() => Effect.fail(failure), unused),
        ),
      ),
    ).rejects.toBe(failure);
  });

  it("preserves a missing-reading failure", async () => {
    const failure = new NotFoundError({
      resource: "reading",
      id: "missing",
    });
    await expect(
      run(
        deleteReadingEffect("missing"),
        Layer.succeed(
          Bloodwork,
          bloodwork(unused, () => Effect.fail(failure)),
        ),
      ),
    ).rejects.toBe(failure);
  });
});
