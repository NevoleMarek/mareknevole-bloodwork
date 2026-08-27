import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StepReviewResearch } from "@/components/admin/step-review-research";
import type { ResearchedEntry } from "@/types/wizard";

const researched: ResearchedEntry[] = [
  {
    vocabularyKey: "ferritin",
    description: "Iron storage marker.",
    referenceRange: { min: 30, max: 400 },
  },
];

describe("StepReviewResearch", () => {
  it("gives every research control an accessible name", () => {
    render(
      <StepReviewResearch
        researched={researched}
        onResearchedChange={vi.fn()}
        onBack={vi.fn()}
        onSave={vi.fn()}
        saving={false}
      />,
    );

    expect(
      screen.getByRole("form", { name: "Review biomarker research" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "ferritin" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Iron storage marker.",
    );
    expect(screen.getByRole("spinbutton", { name: "Ref Min" })).toHaveValue(30);
    expect(screen.getByRole("spinbutton", { name: "Ref Max" })).toHaveValue(
      400,
    );
  });
});
