import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TrendPanel } from "@/components/dashboard/trend-panel";
import { stubChartLayout } from "@/test/recharts";

import type { VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: "Fasting glucose measures blood sugar.",
    featured: false,
    visible: true,
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    referenceRange: { min: 0, max: 130 },
    description: "Low-density lipoprotein.",
    featured: false,
    visible: true,
  },
];

const trends = {
  glucose: {
    kind: "ready" as const,
    points: [
      { date: "2025-06-15", value: 92 },
      { date: "2025-09-15", value: 95 },
    ],
  },
  ldl: {
    kind: "ready" as const,
    points: [
      { date: "2025-06-15", value: 118 },
      { date: "2025-09-15", value: 142 },
    ],
  },
};

beforeEach(stubChartLayout);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TrendPanel", () => {
  it("announces loading through a status region mounted before any selection", () => {
    const { container, rerender } = render(
      <TrendPanel
        selectedKeys={[]}
        trends={{}}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    const status = screen.getByRole("status");
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toBe(status);
    expect(status).toBeEmptyDOMElement();

    rerender(
      <TrendPanel
        selectedKeys={["glucose"]}
        trends={{ glucose: { kind: "loading" } }}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Loading Glucose trend…");

    rerender(
      <TrendPanel
        selectedKeys={["glucose"]}
        trends={trends}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(status).toBeEmptyDOMElement();
  });

  it("renders header, description and a chart summary outside the tab order", () => {
    render(
      <TrendPanel
        selectedKeys={["glucose"]}
        trends={trends}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    // Appears in header and description
    expect(screen.getAllByText("Glucose")).toHaveLength(2);
    expect(screen.getByText("70–100 mg/dL")).toBeInTheDocument();
    expect(screen.getByText(/Fasting glucose/)).toBeInTheDocument();
    const chart = screen.getByRole("img");
    expect(chart).toHaveAccessibleName(
      "Glucose, Jun 15, 2025 – Sep 15, 2025: 92 to 95 mg/dL, latest 95; reference range 70 to 100.",
    );
    expect(chart.querySelector("svg")).not.toBeNull();
    expect(chart.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
  });

  it("renders multiple selected biomarkers", () => {
    render(
      <TrendPanel
        selectedKeys={["glucose", "ldl"]}
        trends={trends}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getAllByText("Glucose")).toHaveLength(2);
    expect(screen.getAllByText("LDL")).toHaveLength(2);
  });
});
