import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import type { HealthMetric } from "@/types/health";

// Give Recharts real viewport measurements in jsdom.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 600, 170),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class implements ResizeObserver {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: target.getBoundingClientRect(),
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

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
  it("renders label and combined latest value", () => {
    render(<BloodPressureChart systolic={systolic} diastolic={diastolic} />);
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("118/78")).toBeInTheDocument();
    expect(screen.getByText("mmHg")).toBeInTheDocument();
  });
  it("aligns readings on actual dates and retains dates present in only one series", () => {
    const { container } = render(
      <BloodPressureChart
        systolic={systolic}
        diastolic={[diastolic[0], { ...diastolic[1], date: "2026-03-08" }]}
      />,
    );
    const lines = container.querySelectorAll(".recharts-line");
    expect(lines).toHaveLength(2);
    const sys = [
      ...container.querySelectorAll('.recharts-line-dot[fill="#14775f"]'),
    ].map((point) => Number(point.getAttribute("cx")));
    const dia = [
      ...container.querySelectorAll('.recharts-line-dot[fill="#4e759d"]'),
    ].map((point) => Number(point.getAttribute("cx")));
    expect(sys).toHaveLength(2);
    expect(dia).toHaveLength(2);
    expect(dia[0]).toBe(sys[0]);
    expect(dia[1]).toBeCloseTo((sys[0] + sys[1]) / 2);
    expect(screen.queryByText("118/78")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Blood pressure history. Latest paired value unavailable.",
    );
  });
});
