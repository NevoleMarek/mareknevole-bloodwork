import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeDashboard } from "@/components/home-dashboard";
import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    referenceRange: { min: 12, max: 17.5 },
  },
];

const readings: BloodworkReading[] = [
  {
    date: "2025-03-01",
    source: "test.pdf",
    measurements: [
      { vocabularyKey: "glucose", value: 98, unit: "mg/dL", status: "normal" },
      {
        vocabularyKey: "hemoglobin",
        value: 14.2,
        unit: "g/dL",
        status: "normal",
      },
    ],
  },
];

describe("HomeDashboard", () => {
  it("renders the heading and metric cards", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ vocabulary: { entries: vocabulary }, readings }),
      }),
    );

    render(<HomeDashboard />);

    expect(
      screen.getByRole("heading", { level: 1, name: /bloodwork/i }),
    ).toBeInTheDocument();

    expect((await screen.findAllByText("Glucose")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Hemoglobin")).length).toBeGreaterThan(
      0,
    );
  });
});
