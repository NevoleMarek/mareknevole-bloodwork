import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { StepReviewResearch } from "@/components/admin/step-review-research";
import type { ResearchedEntry } from "@/types/wizard";

function Harness({ initial }: { initial: ResearchedEntry[] }) {
  const [researched, setResearched] = useState(initial);
  return (
    <StepReviewResearch
      researched={researched}
      onResearchedChange={setResearched}
      onBack={vi.fn()}
      onSave={vi.fn()}
      saving={false}
    />
  );
}

describe("StepReviewResearch", () => {
  it("shows missing intervals and keeps saving disabled until both bounds are reviewed", () => {
    render(
      <Harness
        initial={[
          {
            vocabularyKey: "crp",
            description: "Measures inflammation.",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(/No reviewed reference interval was returned/),
    ).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save Reading" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Ref Min" }), {
      target: { value: "0" },
    });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Ref Max" }), {
      target: { value: "3" },
    });
    expect(save).toBeEnabled();
  });

  it("keeps reversed intervals visible as invalid and saving disabled", () => {
    render(
      <Harness
        initial={[
          {
            vocabularyKey: "crp",
            description: "Measures inflammation.",
            referenceRange: { min: 3, max: 0 },
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        /Reference interval must use finite numbers with the minimum below the maximum/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Reading" })).toBeDisabled();
  });
});
