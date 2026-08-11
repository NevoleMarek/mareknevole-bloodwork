import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendPanel } from "@/components/dashboard/trend-panel";

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

describe("TrendPanel", () => {
  it("renders nothing when no keys are selected", () => {
    const { container } = render(
      <TrendPanel
        selectedKeys={[]}
        trends={{}}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header and description for selected biomarker", () => {
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

  it("shows loading and error states", () => {
    const { rerender } = render(
      <TrendPanel
        selectedKeys={["glucose"]}
        trends={{ glucose: { kind: "loading" } }}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading Glucose trend",
    );

    rerender(
      <TrendPanel
        selectedKeys={["glucose"]}
        trends={{ glucose: { kind: "error" } }}
        vocabulary={vocabulary}
        onRemove={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("Could not load Glucose.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
