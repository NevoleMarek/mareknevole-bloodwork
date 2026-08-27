import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { makeRepository } from "@/lib/effect/repository";
import type { VocabularyRow } from "@/lib/schemas/rows";

function result<T>(results: T[] = []): D1Result<T> {
  return {
    success: true,
    results,
    meta: {
      duration: 1,
      size_after: 1,
      rows_read: results.length,
      rows_written: 1,
      last_row_id: 0,
      changed_db: true,
      changes: 1,
    },
  };
}

class Prepared implements D1PreparedStatement {
  readonly values: unknown[] = [];

  constructor(
    readonly query: string,
    private readonly database: TestDatabase,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values.push(...values);
    return this;
  }

  first<T = unknown>(_columnName: string): Promise<T | null>;
  first<T = object>(): Promise<T | null>;
  async first<T = object>(_columnName?: string): Promise<T | null> {
    // SAFETY: this test statement only implements the vocabulary SELECT used by the repository.
    return this.database.vocabularyRow as T;
  }

  async run<T = object>(): Promise<D1Result<T>> {
    return result<T>();
  }

  async all<T = object>(): Promise<D1Result<T>> {
    return result<T>();
  }

  raw<T = unknown[]>(_options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(_options?: { columnNames?: false }): Promise<T[]>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }) {
    if (options?.columnNames) {
      const columns: string[] = [];
      const rows: [string[], ...T[]] = [columns];
      return Promise.resolve(rows);
    }
    const rows: T[] = [];
    return Promise.resolve(rows);
  }
}

class TestDatabase implements D1Database {
  readonly prepared: Prepared[] = [];
  readonly batches: Prepared[][] = [];
  readonly vocabularyRow = {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    reference_min: 70,
    reference_max: 100,
    description: "AI-generated context",
    interpretation_source: "ai",
    interpretation_model: "gemini-3.1-pro-preview",
    interpretation_generated_at: "2026-01-02T00:00:00Z",
    interpretation_version: 1,
    interpretation_review_status: "pending_review",
    interpretation_reviewed_at: null,
    interpretation_reviewed_by: null,
    interpretation_updated_at: "2026-01-02T00:00:00Z",
    featured: 0,
    visible: 1,
  } satisfies VocabularyRow;

  prepare(query: string) {
    const statement = new Prepared(query, this);
    this.prepared.push(statement);
    return statement;
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]) {
    const prepared = statements.filter(
      (statement): statement is Prepared => statement instanceof Prepared,
    );
    if (prepared.length !== statements.length) {
      throw new Error("TestDatabase received an unknown statement");
    }
    this.batches.push(prepared);
    return statements.map(() => result<T>());
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

const update = {
  key: "glucose",
  label: "Glucose",
  unit: "mg/dL",
  referenceRange: { min: 70, max: 100 },
  description: "Human-edited context",
  featured: false,
  visible: true,
  interpretationReviewStatus: "approved" as const,
};

describe("vocabulary interpretation provenance persistence", () => {
  it("appends an approved revision and increments its version", async () => {
    const database = new TestDatabase();
    const repository = makeRepository(database);

    await Effect.runPromise(repository.updateVocabulary(update));

    expect(database.prepared[0].query).toContain(
      "SELECT * FROM vocabulary WHERE key = ?",
    );
    expect(database.batches).toHaveLength(1);
    const [updateStatement, historyStatement] = database.batches[0];
    expect(updateStatement.query).toContain("interpretation_version = ?");
    expect(updateStatement.values).toContain(2);
    expect(updateStatement.values).toContain("approved");
    expect(historyStatement.query).toContain(
      "INSERT INTO vocabulary_interpretation_history",
    );
    expect(historyStatement.values).toEqual([
      expect.any(String),
      "glucose",
      2,
      "Human-edited context",
      70,
      100,
      "ai",
      "gemini-3.1-pro-preview",
      "2026-01-02T00:00:00Z",
      "approved",
      expect.any(String),
      "admin",
      expect.any(String),
    ]);
  });

  it("preserves the revision when a non-interpretation field changes", async () => {
    const database = new TestDatabase();
    const repository = makeRepository(database);

    await Effect.runPromise(
      repository.updateVocabulary({
        ...update,
        description: "AI-generated context",
        interpretationReviewStatus: "pending_review",
        visible: false,
      }),
    );

    expect(database.batches).toHaveLength(0);
    expect(database.prepared.at(-1)?.query).not.toContain(
      "interpretation_version",
    );
  });
});
