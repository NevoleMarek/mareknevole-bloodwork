import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthGrid } from "@/components/dashboard/health-grid";
import type { HealthMetric } from "@/types/health";

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
  { date: "2026-03-01", metric: "vo2_max", value: 45, unit: "mL/kg/min" },
];

describe("HealthGrid", () => {
  it("renders period selector buttons", () => {
    render(<HealthGrid metrics={metrics} />);
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
  });

  it("renders all metric labels", () => {
    render(<HealthGrid metrics={metrics} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("HRV")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
    expect(screen.getByText("VO2 Max")).toBeInTheDocument();
  });
});
