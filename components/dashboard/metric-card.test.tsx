import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "@/components/dashboard/metric-card";

describe("MetricCard", () => {
  it("renders label, value, and unit", () => {
    render(
      <MetricCard
        label="Glucose"
        value={92}
        unit="mg/dL"
        min={70}
        max={100}
        status="normal"
      />,
    );
    expect(screen.getByText("Glucose")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("mg/dL")).toBeInTheDocument();
  });

  it("renders range bar min/max", () => {
    render(
      <MetricCard
        label="LDL"
        value={142}
        unit="mg/dL"
        min={0}
        max={130}
        status="high"
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
  });
});
