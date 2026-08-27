import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { StepReviewMapping } from "@/components/admin/step-review-mapping";
import type { VocabularyEntry } from "@/types/bloodwork";
import type { MappedVariable } from "@/types/wizard";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: null,
    featured: true,
    visible: true,
  },
  {
    key: "glucose_mass",
    label: "Glucose (mass)",
    unit: "g/dL",
    referenceRange: { min: 0.07, max: 0.1 },
    description: null,
    featured: false,
    visible: true,
  },
];

function Harness() {
  const [mappings, setMappings] = useState<MappedVariable[]>([
    {
      label: "Glucose",
      originalValue: 100,
      originalUnit: "mg/dL",
      vocabularyKey: "glucose",
      convertedValue: 100,
      convertedUnit: "mg/dL",
      isNew: false,
    },
  ]);

  return (
    <StepReviewMapping
      mappings={mappings}
      vocabulary={vocabulary}
      onMappingsChange={setMappings}
      onBack={() => {}}
      onSave={() => {}}
      saving={false}
    />
  );
}

function measurementCells() {
  const rows = within(screen.getByRole("table")).getAllByRole("row");
  return within(rows[1]).getAllByRole("cell");
}

describe("StepReviewMapping", () => {
  it("recomputes from the preserved source when targets change repeatedly", () => {
    render(<Harness />);

    const select = screen.getByRole("combobox", {
      name: "Map Glucose to vocabulary",
    });

    fireEvent.change(select, { target: { value: "glucose_mass" } });
    let cells = measurementCells();
    expect(cells[0]).toHaveTextContent("Glucose (100 mg/dL)");
    expect(cells[3]).toHaveTextContent("0.1");
    expect(cells[4]).toHaveTextContent("g/dL");

    fireEvent.change(select, { target: { value: "glucose" } });
    cells = measurementCells();
    expect(cells[0]).toHaveTextContent("Glucose (100 mg/dL)");
    expect(cells[3]).toHaveTextContent("100");
    expect(cells[4]).toHaveTextContent("mg/dL");

    fireEvent.change(select, { target: { value: "__new__" } });
    cells = measurementCells();
    expect(cells[0]).toHaveTextContent("Glucose (100 mg/dL)");
    expect(cells[3]).toHaveTextContent("100");
    expect(cells[4]).toHaveTextContent("mg/dL");

    fireEvent.change(select, { target: { value: "glucose_mass" } });
    cells = measurementCells();
    expect(cells[0]).toHaveTextContent("Glucose (100 mg/dL)");
    expect(cells[3]).toHaveTextContent("0.1");
    expect(cells[4]).toHaveTextContent("g/dL");
  });
});
