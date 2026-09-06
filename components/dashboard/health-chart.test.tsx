import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HealthChart } from "@/components/dashboard/health-chart";
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

const sampleData: HealthMetric[] = [
  { date: "2026-03-01", metric: "resting_hr", value: 58, unit: "bpm" },
  { date: "2026-03-15", metric: "resting_hr", value: 56, unit: "bpm" },
  { date: "2026-04-01", metric: "resting_hr", value: 55, unit: "bpm" },
];

describe("HealthChart", () => {
  it("renders metric label and latest value", () => {
    render(<HealthChart label="Resting HR" unit="bpm" data={sampleData} />);
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("bpm")).toBeInTheDocument();
  });
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
      "Resting HR history. Latest value 56 bpm.",
    );
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);
  });
});
