import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { StepReviewExtraction } from "@/components/admin/step-review-extraction";
import type { ExtractedVariable } from "@/types/wizard";

function Harness() {
  const [variables, setVariables] = useState<ExtractedVariable[]>([
    { label: "Glucose", value: 5.1, unit: "mmol/L" },
  ]);

  return (
    <StepReviewExtraction
      date="2026-07-28"
      variables={variables}
      onDateChange={vi.fn()}
      onVariablesChange={setVariables}
      onNext={vi.fn()}
    />
  );
}

describe("StepReviewExtraction", () => {
  it("reveals only the latest appended row without delaying interaction", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /Add variable/ }));

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    const newRow = rows[2];
    expect(newRow).toHaveAttribute("data-new", "true");
    expect(newRow.querySelectorAll(".extraction-variable-cell")).toHaveLength(
      4,
    );
    expect(rows[1]).not.toHaveAttribute("data-new");

    const label = within(newRow).getByRole("textbox", {
      name: "Variable 2 label",
    });
    const value = within(newRow).getByRole("spinbutton", {
      name: "Variable 2 value",
    });
    const unit = within(newRow).getByRole("textbox", {
      name: "Variable 2 unit",
    });
    expect(label).toBeEnabled();
    expect(value).toBeEnabled();
    expect(unit).toBeEnabled();

    await user.type(label, "Ferritin");
    await user.clear(value);
    await user.type(value, "42");
    await user.type(unit, "ng/mL");
    expect(label).toHaveValue("Ferritin");
    expect(value).toHaveValue(42);
    expect(unit).toHaveValue("ng/mL");

    await user.click(
      within(newRow).getByRole("button", { name: "Remove Ferritin" }),
    );
    expect(document.querySelector('[data-new="true"]')).not.toBeInTheDocument();
  });
});
