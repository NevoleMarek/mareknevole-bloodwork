import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { PersistenceError } from "@/lib/effect/errors";
import { makeRepository } from "@/lib/effect/repository";

type SupplementRow = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
};

type ChangelogRow = {
  id: string;
  date: string;
  description: string;
  created_at: string;
};

type SupplementInsertValues = readonly [
  id: string,
  name: string,
  dose: string,
  frequency: string,
  startedAt: string,
  createdAt: string,
  updatedAt: string,
];
type ChangelogInsertValues = readonly [
  id: string,
  date: string,
  description: string,
  createdAt: string,
];
type SupplementUpdateValues = readonly [
  name: string,
  dose: string,
  frequency: string,
  startedAt: string,
  updatedAt: string,
  id: string,
];
type SupplementStopValues = readonly [
  stoppedAt: string,
  updatedAt: string,
  id: string,
];

const valuesAs = <T>(values: readonly unknown[]): T => {
  // SAFETY: The fake only receives values from the repository SQL statements below, whose bind order is fixed.
  return values as T;
};

const d1Result = <T>(changes: number): D1Result<T> => ({
  success: true,
  results: [],
  meta: {
    duration: 1,
    size_after: 1,
    rows_read: 0,
    rows_written: changes,
    last_row_id: 0,
    changed_db: changes > 0,
    changes,
  },
});

class AtomicPreparedStatement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: AtomicDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  first<T = unknown>(_columnName: string): Promise<T | null>;
  first<T = object>(): Promise<T | null>;
  first<T>(_columnName?: string): Promise<T | null> {
    return Promise.resolve(this.database.first<T>(this.query, this.values));
  }

  run<T = object>(): Promise<D1Result<T>> {
    return Promise.resolve(this.database.run<T>(this.query, this.values));
  }

  all<T = object>(): Promise<D1Result<T>> {
    return Promise.reject(
      new Error("AtomicPreparedStatement.all was not expected"),
    );
  }

  raw<T = unknown[]>(_options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(_options?: { columnNames?: false }): Promise<T[]>;
  raw(): never {
    throw new Error("AtomicPreparedStatement.raw was not expected");
  }
}

class AtomicDatabase implements D1Database {
  readonly supplements = new Map<string, SupplementRow>();
  readonly changelog = new Map<string, ChangelogRow>();
  private batchStatementIndex: number | null = null;
  private directStatementIndex = 0;

  constructor(private readonly failAtStatement: number | null = null) {}

  prepare(query: string): D1PreparedStatement {
    return new AtomicPreparedStatement(this, query);
  }

  async batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    const supplementsSnapshot = new Map<string, SupplementRow>();
    for (const [id, row] of this.supplements) {
      supplementsSnapshot.set(id, { ...row });
    }
    const changelogSnapshot = new Map<string, ChangelogRow>();
    for (const [id, row] of this.changelog) {
      changelogSnapshot.set(id, { ...row });
    }

    try {
      const results: D1Result<T>[] = [];
      for (const [index, statement] of statements.entries()) {
        this.batchStatementIndex = index;
        results.push(await statement.run<T>());
      }
      return results;
    } catch (error) {
      this.supplements.clear();
      for (const [id, row] of supplementsSnapshot) {
        this.supplements.set(id, row);
      }
      this.changelog.clear();
      for (const [id, row] of changelogSnapshot) {
        this.changelog.set(id, row);
      }
      throw error;
    } finally {
      this.batchStatementIndex = null;
    }
  }

  first<T>(query: string, values: unknown[]): T | null {
    const id = String(values[0]);
    const supplement = this.supplements.get(id);
    if (query.startsWith("SELECT * FROM supplements")) {
      // SAFETY: Repository.updateSupplement requests the complete persisted supplement row.
      return (supplement ?? null) as T | null;
    }
    if (query.startsWith("SELECT name FROM supplements")) {
      if (!supplement) return null;
      // SAFETY: Repository.deleteSupplement requests only the persisted supplement name.
      return { name: supplement.name } as T;
    }
    throw new Error(`Unexpected first query: ${query}`);
  }

  run<T>(query: string, values: unknown[]): D1Result<T> {
    const statementIndex =
      this.batchStatementIndex ?? this.directStatementIndex++;
    if (statementIndex === this.failAtStatement) {
      throw new Error("injected changelog write failure");
    }

    if (query.startsWith("INSERT INTO supplements")) {
      const [id, name, dose, frequency, startedAt, createdAt, updatedAt] =
        valuesAs<SupplementInsertValues>(values);
      this.supplements.set(id, {
        id,
        name,
        dose,
        frequency,
        started_at: startedAt,
        stopped_at: null,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return d1Result<T>(1);
    }

    if (query.startsWith("INSERT INTO supplement_changelog")) {
      const [id, date, description, createdAt] =
        valuesAs<ChangelogInsertValues>(values);
      this.changelog.set(id, { id, date, description, created_at: createdAt });
      return d1Result<T>(1);
    }

    if (query.startsWith("UPDATE supplements SET stopped_at")) {
      const [stoppedAt, updatedAt, id] = valuesAs<SupplementStopValues>(values);
      const supplement = this.supplements.get(id);
      if (!supplement) return d1Result<T>(0);
      this.supplements.set(id, {
        ...supplement,
        stopped_at: stoppedAt,
        updated_at: updatedAt,
      });
      return d1Result<T>(1);
    }

    if (query.startsWith("UPDATE supplements")) {
      const [name, dose, frequency, startedAt, updatedAt, id] =
        valuesAs<SupplementUpdateValues>(values);
      const supplement = this.supplements.get(id);
      if (!supplement) return d1Result<T>(0);
      this.supplements.set(id, {
        ...supplement,
        name,
        dose,
        frequency,
        started_at: startedAt,
        updated_at: updatedAt,
      });
      return d1Result<T>(1);
    }

    throw new Error(`Unexpected run query: ${query}`);
  }

  exec(_query: string): Promise<D1ExecResult> {
    return Promise.reject(new Error("AtomicDatabase.exec was not expected"));
  }

  withSession(
    _constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
  ): D1DatabaseSession {
    throw new Error("AtomicDatabase.withSession was not expected");
  }

  dump(): Promise<ArrayBuffer> {
    return Promise.reject(new Error("AtomicDatabase.dump was not expected"));
  }
}

const initialSupplement = (): SupplementRow => ({
  id: "supplement-1",
  name: "Magnesium",
  dose: "200 mg",
  frequency: "daily",
  started_at: "2026-01-01",
  stopped_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

describe("supplement mutation atomicity", () => {
  it("commits each supplement mutation with all of its changelog rows", async () => {
    const database = new AtomicDatabase();
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.createSupplement({
          name: "Vitamin D",
          dose: "1000 IU",
          frequency: "daily",
          startedAt: "2026-02-01",
          changelogDate: "2026-02-01",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(database.supplements.size).toBe(1);
    expect(database.changelog.size).toBe(1);
    const created = [...database.supplements.values()][0];
    if (!created) throw new Error("create fixture did not persist");

    await expect(
      Effect.runPromise(
        repository.updateSupplement({
          id: created.id,
          name: "Vitamin D3",
          dose: "2000 IU",
          frequency: "twice daily",
          startedAt: "2026-02-02",
          changelogDate: "2026-02-03",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(database.supplements.get(created.id)).toMatchObject({
      name: "Vitamin D3",
      dose: "2000 IU",
      frequency: "twice daily",
      started_at: "2026-02-02",
      stopped_at: null,
    });
    expect(database.changelog.size).toBe(5);

    await expect(
      Effect.runPromise(
        repository.deleteSupplement({
          id: created.id,
          changelogDate: "2026-02-04",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(database.supplements.get(created.id)).toMatchObject({
      stopped_at: expect.any(String),
    });
    expect(database.changelog.size).toBe(6);
    expect(
      [...database.changelog.values()].map((row) => row.description),
    ).toEqual([
      "Added Vitamin D 1000 IU",
      "Changed Vitamin D dose from 1000 IU to 2000 IU",
      "Changed Vitamin D frequency to twice daily",
      "Renamed Vitamin D to Vitamin D3",
      "Changed Vitamin D start date to 2026-02-02",
      "Removed Vitamin D3",
    ]);
  });

  it("rolls back a create when its changelog write fails", async () => {
    const database = new AtomicDatabase(1);
    const repository = makeRepository(database);

    const operation = repository.createSupplement({
      name: "Vitamin D",
      dose: "1000 IU",
      frequency: "daily",
      startedAt: "2026-02-01",
      changelogDate: "2026-02-01",
    });

    await expect(Effect.runPromise(operation)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    expect(database.supplements.size).toBe(0);
    expect(database.changelog.size).toBe(0);
  });

  it("rolls back an update when any changelog write fails", async () => {
    const database = new AtomicDatabase(4);
    const original = initialSupplement();
    database.supplements.set(original.id, original);
    const repository = makeRepository(database);

    const operation = repository.updateSupplement({
      id: original.id,
      name: "Magnesium glycinate",
      dose: "300 mg",
      frequency: "twice daily",
      startedAt: "2026-02-01",
      changelogDate: "2026-02-02",
    });

    await expect(Effect.runPromise(operation)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    expect(database.supplements).toEqual(new Map([[original.id, original]]));
    expect(database.changelog.size).toBe(0);
  });

  it("rolls back a delete when its changelog write fails", async () => {
    const database = new AtomicDatabase(1);
    const original = initialSupplement();
    database.supplements.set(original.id, original);
    const repository = makeRepository(database);

    const operation = repository.deleteSupplement({
      id: original.id,
      changelogDate: "2026-02-02",
    });

    await expect(Effect.runPromise(operation)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    expect(database.supplements).toEqual(new Map([[original.id, original]]));
    expect(database.changelog.size).toBe(0);
  });
});
