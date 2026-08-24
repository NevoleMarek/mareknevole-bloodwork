import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  getBiomarkerTrend,
  getLabOverview,
  getReadingPage,
  getSupplementChangelogPage,
  mapHealthMetricConfigRow,
  mapMeasurementRow,
  mapReadingRow,
  mapSupplementChangelogRow,
  mapSupplementRow,
  mapVocabularyRow,
} from "@/db/queries";

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

class TestPreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly results: D1Result<object>[],
    private readonly bindMock: Mock<
      (...values: Parameters<D1PreparedStatement["bind"]>) => void
    >,
  ) {}

  bind(...values: Parameters<D1PreparedStatement["bind"]>) {
    this.bindMock(...values);
    return this;
  }

  first<T = unknown>(_columnName: string): Promise<T | null>;
  first<T = object>(): Promise<T | null>;
  first(): never {
    throw new Error("TestPreparedStatement.first was not expected");
  }

  run<T = object>(): Promise<D1Result<T>> {
    throw new Error("TestPreparedStatement.run was not expected");
  }

  async all<T = object>(): Promise<D1Result<T>> {
    const result = this.results.shift();
    if (!result) throw new Error("No D1 result fixture remains");
    // SAFETY: Each test queues row fixtures in the same order as its query's
    // explicit `.all<Row>()` calls, which is the unchecked contract of D1 itself.
    return result as D1Result<T>;
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
  readonly bindMock =
    vi.fn<(...values: Parameters<D1PreparedStatement["bind"]>) => void>();
  readonly prepareMock: Mock<(query: string) => D1PreparedStatement>;

  constructor(private readonly results: D1Result<object>[]) {
    this.prepareMock = vi.fn(
      (_query: string) =>
        new TestPreparedStatement(this.results, this.bindMock),
    );
  }

  prepare(query: string) {
    return this.prepareMock(query);
  }

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("row mappers", () => {
  it("maps vocabulary row to VocabularyEntry", () => {
    const row = {
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      reference_min: 70,
      reference_max: 100,
      description: null,
      featured: 0,
      visible: 1,
    };
    expect(mapVocabularyRow(row)).toEqual({
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      referenceRange: { min: 70, max: 100 },
      description: null,
      featured: false,
      visible: true,
    });
  });

  it("maps vocabulary row with featured=1 to true", () => {
    const row = {
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      reference_min: 70,
      reference_max: 100,
      description: null,
      featured: 1,
      visible: 1,
    };
    expect(mapVocabularyRow(row)).toEqual({
      key: "glucose",
      label: "Glucose",
      unit: "mg/dL",
      referenceRange: { min: 70, max: 100 },
      description: null,
      featured: true,
      visible: true,
    });
  });

  it("maps reading row", () => {
    const row = { id: "r1", date: "2025-06-15", source: "test.pdf" };
    expect(mapReadingRow(row)).toEqual({
      id: "r1",
      date: "2025-06-15",
      source: "test.pdf",
    });
  });

  it("maps measurement row", () => {
    const row = {
      id: "m1",
      reading_id: "r1",
      vocabulary_key: "glucose",
      value: 92,
      unit: "mg/dL",
      status: "normal",
    };
    expect(mapMeasurementRow(row)).toEqual({
      vocabularyKey: "glucose",
      value: 92,
      unit: "mg/dL",
      status: "normal",
    });
  });

  it("maps supplement row", () => {
    const row = {
      id: "s1",
      name: "Creatine",
      dose: "5 g",
      frequency: "daily",
      started_at: "Jun 2025",
      stopped_at: null,
      created_at: "2025-06-01T00:00:00Z",
      updated_at: "2025-06-01T00:00:00Z",
    };
    expect(mapSupplementRow(row)).toEqual({
      id: "s1",
      name: "Creatine",
      dose: "5 g",
      frequency: "daily",
      startedAt: "Jun 2025",
      stoppedAt: null,
      createdAt: "2025-06-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
    });
  });

  it("maps supplement changelog row", () => {
    const row = {
      id: "c1",
      date: "2025-06-01",
      description: "Added Creatine 5 g",
      created_at: "2025-06-01T00:00:00Z",
    };
    expect(mapSupplementChangelogRow(row)).toEqual({
      id: "c1",
      date: "2025-06-01",
      description: "Added Creatine 5 g",
      createdAt: "2025-06-01T00:00:00Z",
    });
  });

  it("maps health metric config row", () => {
    const row = {
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "bpm",
      aggregation: "avg",
      visible: 1,
    };
    expect(mapHealthMetricConfigRow(row)).toEqual({
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "bpm",
      aggregation: "avg",
      visible: true,
    });
  });

  it("maps config row with visible=0 to false", () => {
    const row = {
      metric: "steps",
      label: "Steps",
      unit: "count",
      aggregation: "sum",
      visible: 0,
    };
    expect(mapHealthMetricConfigRow(row)).toEqual({
      metric: "steps",
      label: "Steps",
      unit: "count",
      aggregation: "sum",
      visible: false,
    });
  });
});

describe("getLabOverview", () => {
  it("loads the newest panel metadata and latest value for every marker", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const database = new TestDatabase([
      d1Result([{ id: "newest", date: "2026-01-10", source: "newest.pdf" }]),
      d1Result([{ count: 3 }]),
      d1Result([
        {
          id: "m1",
          reading_id: "newest",
          vocabulary_key: "glucose",
          value: 107,
          unit: "mg/dL",
          status: "borderline",
        },
        {
          id: "m2",
          reading_id: "older",
          vocabulary_key: "ferritin",
          value: 90,
          unit: "µg/L",
          status: "normal",
        },
      ]),
    ]);

    const result = await getLabOverview(database);

    expect(database.prepareMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("ORDER BY date DESC, id DESC LIMIT 1"),
    );
    expect(database.prepareMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("ORDER BY latest.reading_date DESC"),
    );
    expect(result).toEqual({
      panelCount: 3,
      latestPanel: {
        date: "2026-01-10",
        source: "newest.pdf",
      },
      latestMeasurements: [
        {
          vocabularyKey: "glucose",
          value: 107,
          unit: "mg/dL",
          status: "borderline",
        },
        {
          vocabularyKey: "ferritin",
          value: 90,
          unit: "µg/L",
          status: "normal",
        },
      ],
    });
  });
});

describe("getBiomarkerTrend", () => {
  it("uses the overview tie-breaker to return one point per reading", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const database = new TestDatabase([
      d1Result([
        { date: "2026-01-01", value: 90 },
        { date: "2026-02-01", value: 95 },
      ]),
    ]);

    const result = await getBiomarkerTrend(database, "glucose");

    expect(database.prepareMock).toHaveBeenCalledWith(
      expect.stringContaining("MAX(id) AS measurement_id"),
    );
    expect(database.prepareMock).toHaveBeenCalledWith(
      expect.stringContaining("GROUP BY reading_id"),
    );
    expect(database.bindMock).toHaveBeenCalledWith("glucose");
    expect(result).toEqual([
      { date: "2026-01-01", value: 90 },
      { date: "2026-02-01", value: 95 },
    ]);
  });
});

describe("getSupplementChangelogPage", () => {
  it("returns twenty rows and a stable cursor", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: `c${index}`,
      date: "2026-01-01",
      description: `Entry ${index}`,
      created_at: `2026-01-01T10:00:${String(59 - index).padStart(2, "0")}Z`,
    }));
    const database = new TestDatabase([d1Result(rows)]);

    const page = await getSupplementChangelogPage(database, null);

    expect(database.bindMock).toHaveBeenCalledWith(21);
    expect(page.entries).toHaveLength(20);
    expect(page.nextCursor).toEqual({
      id: "c19",
      date: "2026-01-01",
      createdAt: "2026-01-01T10:00:40Z",
    });
  });

  it("binds every cursor field before the page limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const database = new TestDatabase([d1Result([])]);
    const cursor = {
      date: "2026-01-01",
      createdAt: "2026-01-01T10:00:00Z",
      id: "c1",
    };

    await getSupplementChangelogPage(database, cursor);

    expect(database.prepareMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE (date, created_at, id) < (?, ?, ?)"),
    );
    expect(database.bindMock).toHaveBeenCalledWith(
      cursor.date,
      cursor.createdAt,
      cursor.id,
      21,
    );
  });
});

describe("getReadingPage", () => {
  it("returns twenty summaries and a stable cursor", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: `r${index}`,
      date: `2026-01-${String(31 - index).padStart(2, "0")}`,
      source: `panel-${index}.pdf`,
      measurement_count: 30 + index,
    }));
    const database = new TestDatabase([d1Result(rows)]);

    const page = await getReadingPage(database, null);

    expect(database.bindMock).toHaveBeenCalledWith(21);
    expect(page.entries).toHaveLength(20);
    expect(page.entries[0]).toEqual({
      id: "r0",
      date: "2026-01-31",
      source: "panel-0.pdf",
      measurementCount: 30,
    });
    expect(page.nextCursor).toEqual({ date: "2026-01-12", id: "r19" });
  });

  it("binds the reading cursor before the page limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const database = new TestDatabase([d1Result([])]);
    const cursor = { date: "2026-01-01", id: "r1" };

    await getReadingPage(database, cursor);

    expect(database.prepareMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE (r.date, r.id) < (?, ?)"),
    );
    expect(database.bindMock).toHaveBeenCalledWith(cursor.date, cursor.id, 21);
  });
});
