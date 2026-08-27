import { describe, expect, it } from "vitest";

import {
  aggregateRecords,
  deduplicateIntervals,
  deriveLabel,
  deriveMetricKey,
  type RawRecord,
} from "./parse-health-export";

describe("deriveMetricKey", () => {
  it("strips HKQuantityTypeIdentifier prefix", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierHeartRate")).toBe(
      "heart_rate",
    );
  });

  it("strips HKCategoryTypeIdentifier prefix", () => {
    expect(deriveMetricKey("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
      "sleep_analysis",
    );
  });

  it("converts PascalCase to snake_case", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierVO2Max")).toBe("vo2_max");
  });

  it("handles BloodPressureSystolic", () => {
    expect(
      deriveMetricKey("HKQuantityTypeIdentifierBloodPressureSystolic"),
    ).toBe("blood_pressure_systolic");
  });
});

describe("deriveLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(deriveLabel("heart_rate")).toBe("Heart Rate");
  });

  it("handles single word", () => {
    expect(deriveLabel("weight")).toBe("Weight");
  });

  it("preserves VO2", () => {
    expect(deriveLabel("vo2_max")).toBe("Vo2 Max");
  });
});

describe("aggregateRecords", () => {
  const records: RawRecord[] = [
    {
      type: "HKQuantityTypeIdentifierHeartRate",
      sourceName: "Apple Watch",
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:00:00 +0200",
      value: "60",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierHeartRate",
      sourceName: "Apple Watch",
      startDate: "2026-04-01 12:00:00 +0200",
      endDate: "2026-04-01 12:00:00 +0200",
      value: "80",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
      sourceName: "iPhone",
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:05:00 +0200",
      value: "500",
      unit: "count",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
      sourceName: "iPhone",
      startDate: "2026-04-01 12:00:00 +0200",
      endDate: "2026-04-01 12:05:00 +0200",
      value: "300",
      unit: "count",
    },
  ];

  it("averages heart rate per day", () => {
    const result = aggregateRecords(records);
    const hr = result.metrics.find(
      (m) => m.metric === "heart_rate" && m.date === "2026-04-01",
    );
    expect(hr).toBeDefined();
    expect(hr!.value).toBe(70);
  });

  it("sums steps per day", () => {
    const result = aggregateRecords(records);
    const steps = result.metrics.find(
      (m) => m.metric === "step_count" && m.date === "2026-04-01",
    );
    expect(steps).toBeDefined();
    expect(steps!.value).toBe(800);
  });

  it("collects config entries for each metric type", () => {
    const result = aggregateRecords(records);
    expect(result.configs).toHaveLength(2);
    const hrConfig = result.configs.find((c) => c.metric === "heart_rate");
    expect(hrConfig).toEqual({
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "count/min",
      aggregation: "avg",
    });
  });

  it("deduplicates overlapping step records from multiple sources", () => {
    const duped: RawRecord[] = [
      // iPhone: 8:00-8:30, 200 steps
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "iPhone",
        startDate: "2026-04-01 08:00:00 +0200",
        endDate: "2026-04-01 08:30:00 +0200",
        value: "200",
        unit: "count",
      },
      // Watch: 8:00-8:30, 180 steps (overlaps iPhone completely)
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "Apple Watch",
        startDate: "2026-04-01 08:00:00 +0200",
        endDate: "2026-04-01 08:30:00 +0200",
        value: "180",
        unit: "count",
      },
      // iPhone only: 12:00-12:30, 300 steps (no overlap)
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "iPhone",
        startDate: "2026-04-01 12:00:00 +0200",
        endDate: "2026-04-01 12:30:00 +0200",
        value: "300",
        unit: "count",
      },
    ];
    const result = aggregateRecords(duped);
    const steps = result.metrics.find((m) => m.metric === "step_count");
    expect(steps).toBeDefined();
    // 200 (first interval, covers 8:00-8:30) + 300 (no overlap) = 500
    // The 180 from Watch is fully covered, so skipped
    expect(steps!.value).toBe(500);
  });
});

describe("deduplicateIntervals", () => {
  it("sums non-overlapping intervals", () => {
    const result = deduplicateIntervals([
      { start: 0, end: 10, value: 100 },
      { start: 20, end: 30, value: 200 },
    ]);
    expect(result).toBe(300);
  });

  it("discards fully covered intervals", () => {
    const result = deduplicateIntervals([
      { start: 0, end: 30, value: 300 },
      { start: 5, end: 20, value: 150 }, // fully inside
    ]);
    expect(result).toBe(300);
  });

  it("takes proportional value for partial overlaps", () => {
    // First: 0-20, value 200 (rate: 10/unit)
    // Second: 10-30, value 200 (rate: 10/unit) — only 10-30 uncovered is 20-30
    const result = deduplicateIntervals([
      { start: 0, end: 20, value: 200 },
      { start: 10, end: 30, value: 200 },
    ]);
    // 200 + 200*(10/20) = 200 + 100 = 300
    expect(result).toBe(300);
  });

  it("uses the higher rate for each partial-overlap segment", () => {
    const result = deduplicateIntervals([
      { start: 0, end: 20, value: 100 }, // rate: 5/unit
      { start: 10, end: 30, value: 200 }, // rate: 10/unit
    ]);
    // 50 from 0-10 and 200 from 10-30.
    expect(result).toBe(250);
  });

  it("treats intervals that only share a boundary as non-overlapping", () => {
    const result = deduplicateIntervals([
      { start: 0, end: 10, value: 100 },
      { start: 10, end: 20, value: 200 },
    ]);
    expect(result).toBe(300);
  });

  it("uses the nested interval rate only within its boundaries", () => {
    const result = deduplicateIntervals([
      { start: 0, end: 30, value: 300 }, // rate: 10/unit
      { start: 10, end: 20, value: 400 }, // rate: 40/unit
    ]);
    // 100 from 0-10, 400 from 10-20, and 100 from 20-30.
    expect(result).toBe(600);
  });

  it("returns 0 for empty input", () => {
    expect(deduplicateIntervals([])).toBe(0);
  });
});
