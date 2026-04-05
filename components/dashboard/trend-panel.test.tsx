import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendPanel } from "@/components/dashboard/trend-panel";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: "Fasting glucose measures blood sugar.",
    featured: false,
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    referenceRange: { min: 0, max: 130 },
    description: "Low-density lipoprotein.",
    featured: false,
  },
];

const readings: BloodworkReading[] = [
  {
    date: "2025-06-15",
    source: "test.pdf",
    measurements: [
      { vocabularyKey: "glucose", value: 92, unit: "mg/dL", status: "normal" },
      { vocabularyKey: "ldl", value: 118, unit: "mg/dL", status: "normal" },
    ],
  },
  {
    date: "2025-09-15",
    source: "test2.pdf",
    measurements: [
      { vocabularyKey: "glucose", value: 95, unit: "mg/dL", status: "normal" },
      { vocabularyKey: "ldl", value: 142, unit: "mg/dL", status: "high" },
    ],
  },
];

describe("TrendPanel", () => {
  it("renders nothing when no keys are selected", () => {
    const { container } = render(
      <TrendPanel
        selectedKeys={[]}
        readings={readings}
        vocabulary={vocabulary}
        onRemove={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header and description for selected biomarker", () => {
    render(
      <TrendPanel
        selectedKeys={["glucose"]}
        readings={readings}
        vocabulary={vocabulary}
        onRemove={() => {}}
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
        readings={readings}
        vocabulary={vocabulary}
        onRemove={() => {}}
      />,
    );
    expect(screen.getAllByText("Glucose")).toHaveLength(2);
    expect(screen.getAllByText("LDL")).toHaveLength(2);
  });
});
