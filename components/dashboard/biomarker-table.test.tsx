import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BiomarkerTable } from "@/components/dashboard/biomarker-table";

const metrics = [
  {
    vocabularyKey: "tsh",
    label: "TSH",
    value: 2.1,
    unit: "mIU/L",
    min: 0.4,
    max: 4.0,
    status: "normal" as const,
  },
  {
    vocabularyKey: "vitd",
    label: "Vitamin D",
    value: 28,
    unit: "ng/mL",
    min: 30,
    max: 100,
    status: "low" as const,
  },
];

describe("BiomarkerTable", () => {
  it("renders all biomarker rows", () => {
    render(
      <BiomarkerTable
        metrics={metrics}
        selected={[]}
        limitReached={false}
        onToggle={() => {}}
        onIntent={() => {}}
      />,
    );
    expect(screen.getByText("TSH")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D")).toBeInTheDocument();
    expect(screen.getByText("2.1")).toBeInTheDocument();
    expect(screen.getByText("0.4 – 4")).toBeInTheDocument();
  });

  it("marks the selected biomarker's toggle as pressed", () => {
    render(
      <BiomarkerTable
        metrics={metrics}
        selected={["tsh"]}
        limitReached={false}
        onToggle={() => {}}
        onIntent={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /^TSH/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Vitamin D/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows each status as visible text", () => {
    render(
      <BiomarkerTable
        metrics={metrics}
        selected={[]}
        limitReached={false}
        onToggle={() => {}}
        onIntent={() => {}}
      />,
    );
    for (const status of ["In range", "Low"]) {
      const text = screen.getByText(status);
      expect(text.closest('[aria-hidden="true"], .sr-only')).toBeNull();
    }
  });
});
