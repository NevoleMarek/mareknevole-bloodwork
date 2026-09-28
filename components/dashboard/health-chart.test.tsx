import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HealthChart } from "@/components/dashboard/health-chart";
import { stubChartLayout } from "@/test/recharts";

beforeEach(stubChartLayout);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HealthChart", () => {
  it("spaces measured points by elapsed calendar time, including across years", () => {
    const data = ["2025-12-31", "2026-01-01", "2026-01-10"].map(
      (date, index) => ({
        date,
        metric: "resting_hr",
        value: 58 - index,
        unit: "bpm",
      }),
    );
    const { container } = render(
      <HealthChart label="Resting HR" unit="bpm" data={data} />,
    );
    const points = [...container.querySelectorAll(".recharts-line-dot")];
    expect(points).toHaveLength(3);
    const x = points.map((point) => Number(point.getAttribute("cx")));
    expect((x[2] - x[1]) / (x[1] - x[0])).toBeCloseTo(9);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Resting HR, Dec 31, 2025 – Jan 10, 2026: 56 to 58 bpm, latest 56.",
    );
    expect(
      screen.getByRole("img").querySelector('[tabindex]:not([tabindex="-1"])'),
    ).toBeNull();
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);
  });
  it("formats readings and axis ticks for display", () => {
    const steps = [4401.44, 11401.44, 9488.6].map((value, index) => ({
      date: `2026-04-0${index + 1}`,
      metric: "step_count",
      value,
      unit: "steps",
    }));
    const { container, rerender } = render(
      <HealthChart label="Steps" unit="steps" data={steps} />,
    );
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(screen.getByText("9,489")).toBeInTheDocument();
    expect(screen.getByText("steps")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Steps, Apr 1, 2026 – Apr 3, 2026: 4,401 to 11,401 steps, latest 9,489.",
    );
    const ticks = [
      ...container.querySelectorAll(
        ".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value",
      ),
    ].map((tick) => tick.textContent);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) expect(tick).toMatch(/^\d{1,3}(,\d{3})*$/);

    rerender(
      <HealthChart
        label="Weight"
        unit="kg"
        data={[
          { date: "2026-04-01", metric: "body_mass", value: 81.44, unit: "kg" },
        ]}
      />,
    );
    expect(screen.getByText("81.4")).toBeInTheDocument();
  });
  it("shows an empty state when the period has no readings", () => {
    render(<HealthChart label="Weight" unit="kg" data={[]} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("No readings in this period.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
