import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/effect/errors";
import { makeRepository } from "@/lib/effect/repository";
import type { VocabularyEntry } from "@/types/bloodwork";

type VocabularyState = {
  key: string;
  unit: string;
  reference_min: number;
  reference_max: number;
  has_measurements: number;
};

function runResult<T>(changes: number): D1Result<T> {
  return {
    success: true,
    results: [],
    meta: {
      duration: 1,
      size_after: 1,
      rows_read: 0,
      rows_written: changes,
      last_row_id: 0,
      changed_db: changes !== 0,
      changes,
    },
  };
}

class TestPreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly changes: number,
    private readonly state: VocabularyState | null,
  ) {}

  bind(..._values: unknown[]) {
    return this;
  }

  first<T = unknown>(_columnName: string): Promise<T | null>;
  first<T = object>(): Promise<T | null>;
  first<T>(): Promise<T | null> {
    // SAFETY: The repository decodes this fixture with VocabularyMutationStateRow
    // immediately after the D1 boundary.
    return Promise.resolve(this.state as T | null);
  }

  run<T = object>(): Promise<D1Result<T>> {
    return Promise.resolve(runResult<T>(this.changes));
  }

  all<T = object>(): Promise<D1Result<T>> {
    throw new Error("TestPreparedStatement.all was not expected");
  }

  raw<T = unknown[]>(_options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(_options?: { columnNames?: false }): Promise<T[]>;
  raw(): never {
    throw new Error("TestPreparedStatement.raw was not expected");
  }
}

class TestDatabase implements D1Database {
  readonly prepare = vi.fn((query: string): D1PreparedStatement => {
    void query;
    return new TestPreparedStatement(this.changes, this.state);
  });

  constructor(
    private readonly changes: number,
    private readonly state: VocabularyState | null,
  ) {}

  batch<T = unknown>(
    _statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    throw new Error("TestDatabase.batch was not expected");
  }

  exec(_query: string): Promise<D1ExecResult> {
    throw new Error("TestDatabase.exec was not expected");
  }

  withSession(
    _constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
  ): D1DatabaseSession {
    throw new Error("TestDatabase.withSession was not expected");
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error("TestDatabase.dump was not expected");
  }
}

function updateDatabase({
  changes,
  state,
}: {
  changes: number;
  state: VocabularyState | null;
}) {
  const database = new TestDatabase(changes, state);
  return {
    database,
    prepare: database.prepare,
  };
}

const vocabularyEntry: VocabularyEntry = {
  key: "glucose",
  label: "Glucose",
  unit: "mg/dL",
  referenceRange: { min: 70, max: 100 },
  description: null,
  featured: true,
  visible: true,
};

describe("Repository.updateVocabulary", () => {
  it("rejects unit and range changes after measurements exist", async () => {
    const { database, prepare } = updateDatabase({
      changes: 0,
      state: {
        key: "glucose",
        unit: "mg/dL",
        reference_min: 70,
        reference_max: 100,
        has_measurements: 1,
      },
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          ...vocabularyEntry,
          unit: "mmol/L",
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare.mock.calls[0]?.[0]).toContain("NOT EXISTS");
  });

  it("rejects a reference-range change after measurements exist", async () => {
    const { database } = updateDatabase({
      changes: 0,
      state: {
        key: "glucose",
        unit: "mg/dL",
        reference_min: 70,
        reference_max: 100,
        has_measurements: 1,
      },
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          ...vocabularyEntry,
          referenceRange: { min: 80, max: 110 },
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows presentation changes while preserving historical metadata", async () => {
    const { database, prepare } = updateDatabase({
      changes: 1,
      state: null,
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          ...vocabularyEntry,
          label: "Fasting glucose",
          visible: false,
        }),
      ),
    ).resolves.toBeUndefined();
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("allows unit and range changes before the first measurement", async () => {
    const { database } = updateDatabase({
      changes: 1,
      state: null,
    });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(
        repository.updateVocabulary({
          ...vocabularyEntry,
          unit: "mmol/L",
          referenceRange: { min: 3.9, max: 5.5 },
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps a missing vocabulary key as not found", async () => {
    const { database } = updateDatabase({ changes: 0, state: null });
    const repository = makeRepository(database);

    await expect(
      Effect.runPromise(repository.updateVocabulary(vocabularyEntry)),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
