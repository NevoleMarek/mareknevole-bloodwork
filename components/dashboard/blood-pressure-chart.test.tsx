import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { stubChartLayout } from "@/test/recharts";
import type { HealthMetric } from "@/types/health";

beforeEach(stubChartLayout);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
  it("renders label, combined latest value, legend and a two-series summary outside the tab order", () => {
    render(<BloodPressureChart systolic={systolic} diastolic={diastolic} />);
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("118/78")).toBeInTheDocument();
    expect(screen.getByText("mmHg")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Blood pressure, Mar 1, 2026 – Mar 15, 2026: systolic 118 to 120 mmHg, diastolic 78 to 80 mmHg, latest 118/78 mmHg.",
    );
    expect(screen.getByText("Systolic")).toBeInTheDocument();
    expect(screen.getByText("Diastolic")).toBeInTheDocument();
    expect(
      screen.getByRole("img").querySelector('[tabindex]:not([tabindex="-1"])'),
    ).toBeNull();
  });
  it("aligns readings on actual dates and retains dates present in only one series", () => {
    const { container } = render(
      <BloodPressureChart
        systolic={systolic}
        diastolic={[diastolic[0], { ...diastolic[1], date: "2026-03-04" }]}
      />,
    );
    const [sys, dia] = [
      ...container.querySelectorAll(".recharts-line-dots"),
    ].map((series) =>
      [...series.querySelectorAll(".recharts-line-dot")].map((dot) =>
        Number(dot.getAttribute("cx")),
      ),
    );
    expect(sys).toHaveLength(2);
    expect(dia).toHaveLength(2);
    expect(dia[0]).toBe(sys[0]);
    expect((dia[1] - sys[0]) / (sys[1] - sys[0])).toBeCloseTo(3 / 14);
    expect(screen.queryByText("118/78")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Blood pressure, Mar 1, 2026 – Mar 15, 2026: systolic 118 to 120 mmHg, diastolic 78 to 80 mmHg.",
    );
  });
  it("formats averaged readings", () => {
    render(
      <BloodPressureChart
        systolic={[{ ...systolic[0], value: 120.94 }]}
        diastolic={[{ ...diastolic[0], value: 80.26 }]}
      />,
    );
    expect(screen.getByText("120.9/80.3")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Blood pressure, Mar 1, 2026: systolic 120.9 mmHg, diastolic 80.3 mmHg, latest 120.9/80.3 mmHg.",
    );
  });
  it("shows an empty state when the period has no readings", () => {
    render(<BloodPressureChart systolic={[]} diastolic={[]} />);
    expect(screen.getByText("No readings in this period.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
