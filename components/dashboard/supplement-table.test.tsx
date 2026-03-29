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
    startedAt: "Jun 2025",
    stoppedAt: null,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "s2",
    name: "Vitamin D3",
    dose: "5000 IU",
    frequency: "daily",
    startedAt: "Jan 2025",
    stoppedAt: null,
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
});
