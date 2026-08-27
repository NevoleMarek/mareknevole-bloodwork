import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import type { HealthMetric } from "@/types/health";

const systolic: HealthMetric[] = [
  {
    date: "2026-03-01",
    metric: "blood_pressure_systolic",
    value: 120,
    unit: "mmHg",
  },
  {
    date: "2026-03-15",
    metric: "blood_pressure_systolic",
    value: 118,
    unit: "mmHg",
  },
];
const diastolic: HealthMetric[] = [
  {
    date: "2026-03-01",
    metric: "blood_pressure_diastolic",
    value: 80,
    unit: "mmHg",
  },
  {
    date: "2026-03-15",
    metric: "blood_pressure_diastolic",
    value: 78,
    unit: "mmHg",
  },
];

describe("BloodPressureChart", () => {
  it("renders label and combined latest value", () => {
    render(<BloodPressureChart systolic={systolic} diastolic={diastolic} />);
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("118/78")).toBeInTheDocument();
    expect(screen.getByText("mmHg")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Blood pressure history. Latest value 118 over 78 millimeters of mercury.",
      }),
    ).toBeInTheDocument();
  });
});
