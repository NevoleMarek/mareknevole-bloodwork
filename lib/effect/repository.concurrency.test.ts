// @vitest-environment node

import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { makeRepository } from "@/lib/effect/repository";
import { ConflictError } from "@/lib/effect/errors";

function d1Result<T>(results: T[] = [], changes = 0): D1Result<T> {
  return {
    success: true,
    results,
    meta: {
      duration: 1,
      size_after: 1,
      rows_read: results.length,
      rows_written: changes,
      last_row_id: 0,
      changed_db: changes > 0,
      changes,
    },
  };
}

function fakeDatabase(options: {
  readonly first: unknown | readonly unknown[];
  readonly run: D1Result<unknown>;
}) {
  const queries: string[] = [];
  const binds: unknown[][] = [];
  let firstIndex = 0;
  // SAFETY: Repository tests exercise only prepare/bind/first/run; the fake
  // deliberately supplies that subset of the D1 adapter.
  const database = {
    prepare(query: string) {
      queries.push(query);
      const statement = {
        bind(...values: unknown[]) {
          binds.push(values);
          return statement;
        },
        async first<T>() {
          const first = Array.isArray(options.first)
            ? options.first[firstIndex++]
            : options.first;
          // SAFETY: The fake mirrors D1's generic first<T>() boundary and
          // each test supplies a fixture matching the requested row type.
          return first as T | null;
        },
        async run<T>() {
          // SAFETY: The fake mirrors D1's generic run<T>() boundary.
          return options.run as D1Result<T>;
        },
      };
      return statement;
    },
  } as D1Database;
  return { database, queries, binds };
}

describe("repository optimistic concurrency", () => {
  it("rejects a supplement update when the row version is stale", async () => {
    const { database, queries, binds } = fakeDatabase({
      first: {
        name: "Creatine",
        dose: "5 g",
        frequency: "daily",
        started_at: "2025-06",
        version: 2,
      },
      run: d1Result([], 0),
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateSupplement({
          id: "supplement-1",
          name: "Creatine",
          dose: "10 g",
          frequency: "daily",
          startedAt: "2025-06",
          changelogDate: "2026-08-27",
          expectedVersion: 1,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(queries[1]).toContain(
      "WHERE id = ? AND version = ? AND stopped_at IS NULL",
    );
    expect(queries[1]).toContain("version = version + 1");
    expect(binds[1]).toEqual([
      "Creatine",
      "10 g",
      "daily",
      "2025-06",
      expect.any(String),
      "supplement-1",
      1,
    ]);
    expect(queries).toHaveLength(2);
  });

  it("updates only the requested vocabulary flag", async () => {
    const { database, queries, binds } = fakeDatabase({
      first: null,
      run: d1Result([], 1),
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          key: "glucose",
          visible: false,
          expectedVersion: 3,
        }),
      ),
    ).resolves.toBeUndefined();

    expect(queries[0]).toContain("SET visible = ?, version = version + 1");
    expect(queries[0]).not.toContain("label = ?");
    expect(queries[0]).toContain("WHERE key = ? AND version = ?");
    expect(binds[0]).toEqual([0, "glucose", 3]);
  });

  it("returns a conflict instead of accepting a stale vocabulary patch", async () => {
    const { database } = fakeDatabase({
      first: [{ key: "glucose" }],
      run: d1Result([], 0),
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          key: "glucose",
          featured: true,
          expectedVersion: 2,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a stale vocabulary deletion instead of removing newer state", async () => {
    const { database, queries, binds } = fakeDatabase({
      first: [{ key: "glucose" }],
      run: d1Result([], 0),
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.deleteVocabulary({
          key: "glucose",
          expectedVersion: 2,
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    // SAFETY: A zero-row conditional delete is classified as a conflict when
    // the key still exists, proving the stale request cannot remove it.
    expect(queries[0]).toContain(
      "DELETE FROM vocabulary WHERE key = ? AND version = ?",
    );
    expect(binds[0]).toEqual(["glucose", 2]);
    expect(queries).toHaveLength(2);
  });

  it("deletes vocabulary when the expected version is current", async () => {
    const { database, queries, binds } = fakeDatabase({
      first: null,
      run: d1Result([], 1),
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.deleteVocabulary({
          key: "glucose",
          expectedVersion: 3,
        }),
      ),
    ).resolves.toBeUndefined();

    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain(
      "DELETE FROM vocabulary WHERE key = ? AND version = ?",
    );
    expect(binds[0]).toEqual(["glucose", 3]);
  });
});
