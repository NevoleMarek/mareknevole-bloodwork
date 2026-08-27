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
  it("requires an explicit specimen date when extraction did not find one", async () => {
    const onNext = vi.fn();
    render(
      <StepReviewExtraction
        date={null}
        variables={[{ label: "Glucose", value: 5.1, unit: "mmol/L" }]}
        onDateChange={vi.fn()}
        onVariablesChange={vi.fn()}
        onNext={onNext}
      />,
    );

    expect(
      screen.getByText(
        "A valid specimen collection date is required before continuing.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    ).toBeDisabled();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Next: Map Variables/ }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("passes the reviewed specimen date to the next step", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    function DateHarness() {
      const [date, setDate] = useState("");
      return (
        <StepReviewExtraction
          date={date}
          variables={[{ label: "Glucose", value: 5.1, unit: "mmol/L" }]}
          onDateChange={setDate}
          onVariablesChange={vi.fn()}
          onNext={onNext}
        />
      );
    }

    render(<DateHarness />);
    await user.type(
      screen.getByLabelText(/Specimen collection date/),
      "2026-07-28",
    );
    expect(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /Next: Map Variables/ }),
    );
    expect(onNext).toHaveBeenCalledWith("2026-07-28");
  });

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
