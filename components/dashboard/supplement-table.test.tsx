import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SupplementTable } from "@/components/dashboard/supplement-table";
import type { Supplement } from "@/types/bloodwork";

const supplements: Supplement[] = [
  {
    id: "s1",
    name: "Creatine",
    dose: "5 g",
    frequency: "daily",
    startedAt: "2025-06",
    stoppedAt: null,
    ingredientForm: "creatine monohydrate, powder",
    interactionNotes: "Not checked",
    contraindicationNotes: "Not checked",
    clinicianReview: "Not reviewed",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "s2",
    name: "Vitamin D3",
    dose: "5000 IU",
    frequency: "daily",
    startedAt: "2025-01",
    stoppedAt: null,
    ingredientForm: "cholecalciferol, tablet",
    interactionNotes: "Not checked",
    contraindicationNotes: "Not checked",
    clinicianReview: "Not reviewed",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

describe("SupplementTable", () => {
  it("renders all supplements", () => {
    render(<SupplementTable supplements={supplements} />);
    expect(screen.getByText("Creatine")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D3")).toBeInTheDocument();
    expect(screen.getByText("5 g")).toBeInTheDocument();
    expect(screen.getByText("5000 IU")).toBeInTheDocument();
  });

  it("shows safety context and distinguishes missing review from clearance", () => {
    render(
      <SupplementTable
        supplements={[
          {
            ...supplements[0],
            interactionNotes: "",
            contraindicationNotes: "",
            clinicianReview: "",
          },
        ]}
      />,
    );

    expect(
      screen.getByText(/Personal log, not medical advice/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ingredient\/form:/)).toBeInTheDocument();
    expect(screen.getAllByText("Not recorded")).toHaveLength(3);
  });
});
