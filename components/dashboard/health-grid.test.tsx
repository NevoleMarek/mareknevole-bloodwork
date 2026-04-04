import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthGrid } from "@/components/dashboard/health-grid";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

const metrics: HealthMetric[] = [
  { date: "2026-03-01", metric: "weight", value: 82, unit: "kg" },
  { date: "2026-03-01", metric: "resting_hr", value: 58, unit: "bpm" },
  { date: "2026-03-01", metric: "hrv", value: 42, unit: "ms" },
  {
    date: "2026-03-01",
    metric: "blood_pressure_systolic",
    value: 120,
    unit: "mmHg",
  },
  {
    date: "2026-03-01",
    metric: "blood_pressure_diastolic",
    value: 80,
    unit: "mmHg",
  },
  { date: "2026-03-01", metric: "sleep_duration", value: 7.3, unit: "hr" },
];

const configs: HealthMetricConfig[] = [
  {
    metric: "weight",
    label: "Weight",
    unit: "kg",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "resting_hr",
    label: "Resting HR",
    unit: "bpm",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "hrv",
    label: "HRV",
    unit: "ms",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "blood_pressure_systolic",
    label: "Blood Pressure Systolic",
    unit: "mmHg",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "blood_pressure_diastolic",
    label: "Blood Pressure Diastolic",
    unit: "mmHg",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "sleep_duration",
    label: "Sleep",
    unit: "hr",
    aggregation: "duration",
    visible: true,
  },
];

describe("HealthGrid", () => {
  it("renders period selector buttons", () => {
    render(<HealthGrid metrics={metrics} configs={configs} />);
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
  });

  it("renders metric labels from config", () => {
    render(<HealthGrid metrics={metrics} configs={configs} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("HRV")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
  });
});
