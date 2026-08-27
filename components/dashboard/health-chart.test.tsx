import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric } from "@/types/health";

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
    expect(
      screen.getByRole("img", {
        name: "Resting HR history. Latest value 55 bpm.",
      }),
    ).toBeInTheDocument();
  });
});
