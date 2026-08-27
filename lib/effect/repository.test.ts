// @vitest-environment node

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRepository } from "@/lib/effect/repository";

type SupplementState = {
  readonly name: string;
  readonly started_at: string;
  stopped_at: string | null;
  updated_at: string;
};

type ChangelogEntry = {
  readonly date: string;
  readonly description: string;
  readonly created_at: string;
};

const decodeString = Schema.decodeUnknownSync(Schema.String);

const runResult = <T>(changes: number): D1Result<T> => ({
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

class SupplementPreparedStatement implements D1PreparedStatement {
  private boundValues: Parameters<D1PreparedStatement["bind"]> = [];

  constructor(
    private readonly database: SupplementDatabase,
    private readonly query: string,
  ) {}

  bind(...values: Parameters<D1PreparedStatement["bind"]>) {
    this.boundValues = values;
    return this;
  }

  first<T = SupplementState>(_columnName: string): Promise<T | null>;
  first<T = SupplementState>(): Promise<T | null>;
  first<T>(): Promise<T | null> {
    if (!this.query.includes("SELECT name, started_at, stopped_at")) {
      throw new Error(`Unexpected first query: ${this.query}`);
    }
    // SAFETY: The repository decodes this D1 row with SupplementDeleteRow.
    return Promise.resolve(this.database.supplement as T);
  }

  run<T = SupplementState>(): Promise<D1Result<T>> {
    if (this.query.startsWith("UPDATE supplements SET stopped_at")) {
      const stoppedAt = decodeString(this.boundValues[0]);
      const updatedAt = decodeString(this.boundValues[1]);
      const guarded = this.query.includes("AND stopped_at IS NULL");
      const canUpdate =
        !guarded || this.database.supplement.stopped_at === null;
      if (canUpdate) {
        this.database.supplement.stopped_at = stoppedAt;
        this.database.supplement.updated_at = updatedAt;
      }
      return Promise.resolve(runResult<T>(canUpdate ? 1 : 0));
    }
    if (this.query.startsWith("INSERT INTO supplement_changelog")) {
      this.database.changelog.push({
        date: decodeString(this.boundValues[1]),
        description: decodeString(this.boundValues[2]),
        created_at: decodeString(this.boundValues[3]),
      });
      return Promise.resolve(runResult<T>(1));
    }
    throw new Error(`Unexpected run query: ${this.query}`);
  }

  all<T = SupplementState>(): Promise<D1Result<T>> {
    throw new Error("SupplementPreparedStatement.all was not expected");
  }

  raw<T = unknown[]>(_options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(_options?: { columnNames?: false }): Promise<T[]>;
  raw(): never {
    throw new Error("SupplementPreparedStatement.raw was not expected");
  }
}

class SupplementDatabase implements D1Database {
  readonly changelog: ChangelogEntry[] = [];

  constructor(readonly supplement: SupplementState) {}

  prepare(query: string) {
    return new SupplementPreparedStatement(this, query);
  }

  batch<T = unknown>(
    _statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    throw new Error("SupplementDatabase.batch was not expected");
  }

  exec(_query: string): Promise<D1ExecResult> {
    throw new Error("SupplementDatabase.exec was not expected");
  }

  withSession(
    _constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
  ): D1DatabaseSession {
    throw new Error("SupplementDatabase.withSession was not expected");
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error("SupplementDatabase.dump was not expected");
  }
}

const deleteInput = {
  id: "supplement-1",
  changelogDate: "2026-08-27",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("deleteSupplement", () => {
  it("preserves a historical stop boundary and changelog when stopped again", async () => {
    const historicalStop = "2026-08-01T12:00:00.000Z";
    const database = new SupplementDatabase({
      name: "Creatine",
      started_at: "2025-01",
      stopped_at: historicalStop,
      updated_at: historicalStop,
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(repository.deleteSupplement(deleteInput)),
    ).rejects.toMatchObject({
      operation: "Repository.deleteSupplement",
      message: "A supplement already has a stop date",
    });

    expect(database.supplement.stopped_at).toBe(historicalStop);
    expect(database.supplement.updated_at).toBe(historicalStop);
    expect(database.changelog).toHaveLength(0);
  });

  it("does not rewrite the boundary or append history for a repeated stop", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T10:00:00.000Z"));
    const database = new SupplementDatabase({
      name: "Creatine",
      started_at: "2025-01",
      stopped_at: null,
      updated_at: "2025-01-01T00:00:00.000Z",
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(repository.deleteSupplement(deleteInput)),
    ).resolves.toBeUndefined();
    const firstStop = database.supplement.stopped_at;
    expect(firstStop).toBe("2026-08-27T10:00:00.000Z");
    expect(database.changelog).toHaveLength(1);

    vi.setSystemTime(new Date("2026-08-27T11:00:00.000Z"));
    await expect(
      Effect.runPromise(repository.deleteSupplement(deleteInput)),
    ).rejects.toMatchObject({
      operation: "Repository.deleteSupplement",
      message: "A supplement already has a stop date",
    });

    expect(database.supplement.stopped_at).toBe(firstStop);
    expect(database.changelog).toHaveLength(1);
  });
});
