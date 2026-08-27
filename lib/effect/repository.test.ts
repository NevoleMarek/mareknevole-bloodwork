import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { makeRepository } from "@/lib/effect/repository";
import type { SaveReadingRequest } from "@/types/wizard";

function d1Result<T>(results: T[]): D1Result<T> {
  return {
    success: true,
    results,
    meta: {
      duration: 1,
      size_after: 1,
      rows_read: results.length,
      rows_written: 0,
      last_row_id: 0,
      changed_db: false,
      changes: 0,
    },
  };
}

type VocabularyRow = {
  key: string;
  label: string;
  unit: string;
  reference_min: number;
  reference_max: number;
  description: string | null;
  featured: number;
  visible: number;
};

const VocabularyBindValues = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.Number,
  Schema.Number,
  Schema.NullOr(Schema.String),
  Schema.Number,
  Schema.Number,
]);

const ReadingBindValues = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
]);

class SaveReadingStatement implements D1PreparedStatement {
  readonly values: Parameters<D1PreparedStatement["bind"]> = [];

  constructor(
    private readonly database: SaveReadingDatabase,
    readonly query: string,
  ) {}

  bind(...values: Parameters<D1PreparedStatement["bind"]>) {
    this.values.splice(0, this.values.length, ...values);
    return this;
  }

  first<T = unknown>(_columnName: string): Promise<T | null>;
  first<T = object>(): Promise<T | null>;
  first(): never {
    throw new Error("SaveReadingStatement.first was not expected");
  }

  run<T = object>(): Promise<D1Result<T>> {
    throw new Error("SaveReadingStatement.run was not expected");
  }

  async all<T = object>(): Promise<D1Result<T>> {
    // SAFETY: The fake only serves the vocabulary rows requested by this test.
    return d1Result(this.database.vocabularyRows) as D1Result<T>;
  }

  raw<T = unknown[]>(_options: {
    columnNames: true;
  }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(_options?: { columnNames?: false }): Promise<T[]>;
  raw(): never {
    throw new Error("SaveReadingStatement.raw was not expected");
  }
}

class SaveReadingDatabase implements D1Database {
  readonly vocabularyRows: VocabularyRow[] = [];
  readonly readingIds: string[] = [];

  prepare(query: string): D1PreparedStatement {
    return new SaveReadingStatement(this, query);
  }

  async batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    for (const statement of statements) {
      if (!(statement instanceof SaveReadingStatement)) {
        throw new Error("Unexpected statement in save-reading batch");
      }
      const saveReadingStatement = statement;
      if (saveReadingStatement.query.startsWith("INSERT INTO vocabulary")) {
        // SAFETY: Repository.saveReading binds this exact vocabulary tuple for this SQL.
        const values = Schema.decodeUnknownSync(VocabularyBindValues)(
          saveReadingStatement.values,
        );
        const [
          key,
          label,
          unit,
          referenceMin,
          referenceMax,
          description,
          featured,
          visible,
        ] = values;
        this.vocabularyRows.push({
          key,
          label,
          unit,
          reference_min: referenceMin,
          reference_max: referenceMax,
          description,
          featured,
          visible,
        });
      } else if (
        saveReadingStatement.query.startsWith("INSERT INTO readings")
      ) {
        // SAFETY: Repository.saveReading binds reading ID first for this SQL.
        const [readingId] = Schema.decodeUnknownSync(ReadingBindValues)(
          saveReadingStatement.values,
        );
        this.readingIds.push(readingId);
      }
    }
    return [];
  }

  exec(_query: string): Promise<D1ExecResult> {
    throw new Error("SaveReadingDatabase.exec was not expected");
  }

  withSession(
    _constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
  ): D1DatabaseSession {
    throw new Error("SaveReadingDatabase.withSession was not expected");
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error("SaveReadingDatabase.dump was not expected");
  }
}

const saveReadingRequest = (
  featured: boolean,
  visible: boolean,
): SaveReadingRequest => ({
  date: "2026-08-26",
  source: "panel.pdf",
  measurements: [
    {
      vocabularyKey: "marker",
      value: 42,
      unit: "unit",
      status: "normal",
    },
  ],
  newVocabulary: [
    {
      key: "marker",
      label: "Marker",
      unit: "unit",
      referenceRange: { min: 10, max: 100 },
      description: "A marker",
      featured,
      visible,
    },
  ],
});

describe("Repository.saveReading", () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "persists featured=%s and visible=%s for new vocabulary",
    async (featured, visible) => {
      const database = new SaveReadingDatabase();
      const repository = makeRepository(database);

      const readingId = await Effect.runPromise(
        repository.saveReading(saveReadingRequest(featured, visible)),
      );

      expect(database.readingIds).toContain(readingId);
      await expect(
        Effect.runPromise(repository.getVocabulary()),
      ).resolves.toEqual([
        {
          key: "marker",
          label: "Marker",
          unit: "unit",
          referenceRange: { min: 10, max: 100 },
          description: "A marker",
          featured,
          visible,
        },
      ]);
    },
  );
});
