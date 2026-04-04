import { describe, expect, it } from "vitest";

import {
  aggregateRecords,
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

  it("deduplicates sum metrics by picking the primary source", () => {
    const duped: RawRecord[] = [
      // iPhone has 3 records — primary source
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "iPhone",
        startDate: "2026-04-01 08:00:00 +0200",
        endDate: "2026-04-01 08:05:00 +0200",
        value: "200",
        unit: "count",
      },
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "iPhone",
        startDate: "2026-04-01 09:00:00 +0200",
        endDate: "2026-04-01 09:05:00 +0200",
        value: "300",
        unit: "count",
      },
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "iPhone",
        startDate: "2026-04-01 10:00:00 +0200",
        endDate: "2026-04-01 10:05:00 +0200",
        value: "100",
        unit: "count",
      },
      // Apple Watch has 1 record — secondary, should be ignored
      {
        type: "HKQuantityTypeIdentifierStepCount",
        sourceName: "Apple Watch",
        startDate: "2026-04-01 08:00:00 +0200",
        endDate: "2026-04-01 10:05:00 +0200",
        value: "550",
        unit: "count",
      },
    ];
    const result = aggregateRecords(duped);
    const steps = result.metrics.find((m) => m.metric === "step_count");
    expect(steps).toBeDefined();
    // Should be 200+300+100=600 (iPhone only), not 600+550=1150
    expect(steps!.value).toBe(600);
  });
});
