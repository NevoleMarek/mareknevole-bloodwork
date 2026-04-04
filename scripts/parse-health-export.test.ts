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
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:00:00 +0200",
      value: "60",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierHeartRate",
      startDate: "2026-04-01 12:00:00 +0200",
      endDate: "2026-04-01 12:00:00 +0200",
      value: "80",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:05:00 +0200",
      value: "500",
      unit: "count",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
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
});
