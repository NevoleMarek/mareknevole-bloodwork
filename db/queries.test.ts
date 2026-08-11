import { afterEach, describe, expect, it, vi } from "vitest";

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
    const all = vi
      .fn()
      .mockResolvedValueOnce(
        d1Result([{ id: "newest", date: "2026-01-10", source: "newest.pdf" }]),
      )
      .mockResolvedValueOnce(d1Result([{ count: 3 }]))
      .mockResolvedValueOnce(
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
      );
    const prepare = vi.fn(() => ({ all }));

    const result = await getLabOverview({
      prepare,
    } as unknown as D1Database);

    expect(prepare).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("ORDER BY date DESC, id DESC LIMIT 1"),
    );
    expect(prepare).toHaveBeenNthCalledWith(
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
    const all = vi.fn().mockResolvedValue(
      d1Result([
        { date: "2026-01-01", value: 90 },
        { date: "2026-02-01", value: 95 },
      ]),
    );
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));

    const result = await getBiomarkerTrend(
      { prepare } as unknown as D1Database,
      "glucose",
    );

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("MAX(id) AS measurement_id"),
    );
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("GROUP BY reading_id"),
    );
    expect(bind).toHaveBeenCalledWith("glucose");
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
    const all = vi.fn().mockResolvedValue(d1Result(rows));
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));

    const page = await getSupplementChangelogPage(
      { prepare } as unknown as D1Database,
      null,
    );

    expect(bind).toHaveBeenCalledWith(21);
    expect(page.entries).toHaveLength(20);
    expect(page.nextCursor).toEqual({
      id: "c19",
      date: "2026-01-01",
      createdAt: "2026-01-01T10:00:40Z",
    });
  });

  it("binds every cursor field before the page limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const all = vi.fn().mockResolvedValue(d1Result([]));
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));
    const cursor = {
      date: "2026-01-01",
      createdAt: "2026-01-01T10:00:00Z",
      id: "c1",
    };

    await getSupplementChangelogPage(
      { prepare } as unknown as D1Database,
      cursor,
    );

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("WHERE (date, created_at, id) < (?, ?, ?)"),
    );
    expect(bind).toHaveBeenCalledWith(
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
    const all = vi.fn().mockResolvedValue(d1Result(rows));
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));

    const page = await getReadingPage(
      { prepare } as unknown as D1Database,
      null,
    );

    expect(bind).toHaveBeenCalledWith(21);
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
    const all = vi.fn().mockResolvedValue(d1Result([]));
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));
    const cursor = { date: "2026-01-01", id: "r1" };

    await getReadingPage({ prepare } as unknown as D1Database, cursor);

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("WHERE (r.date, r.id) < (?, ?)"),
    );
    expect(bind).toHaveBeenCalledWith(cursor.date, cursor.id, 21);
  });
});
