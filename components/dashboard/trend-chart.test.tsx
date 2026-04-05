import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendChart } from "@/components/dashboard/trend-chart";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: null,
    featured: false,
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    referenceRange: { min: 0, max: 130 },
    description: null,
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

describe("TrendChart", () => {
  it("renders legend with metric names", () => {
    render(<TrendChart readings={readings} vocabulary={vocabulary} />);
    expect(screen.getByText("Glucose")).toBeInTheDocument();
    expect(screen.getByText("LDL")).toBeInTheDocument();
  });
});
