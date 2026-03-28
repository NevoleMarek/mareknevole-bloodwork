import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SupplementStack } from "@/components/dashboard/supplement-stack";

import type { Supplement, SupplementChangelog } from "@/types/bloodwork";

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

const changelog: SupplementChangelog[] = [
  {
    id: "c1",
    date: "2025-06-01",
    description: "Added Creatine 5 g",
    createdAt: "2025-06-01T00:00:00Z",
  },
];

describe("SupplementStack", () => {
  it("shows summary when collapsed", () => {
    render(
      <SupplementStack
        supplements={supplements}
        changelog={changelog}
        lastUpdated="Jun 2025"
      />,
    );
    expect(screen.getByText(/2 active/)).toBeInTheDocument();
  });

  it("shows table and changelog when expanded", async () => {
    const user = userEvent.setup();
    render(
      <SupplementStack
        supplements={supplements}
        changelog={changelog}
        lastUpdated="Jun 2025"
      />,
    );
    await user.click(screen.getByText(/2 active/));
    expect(screen.getByText("Creatine")).toBeInTheDocument();
    expect(screen.getByText("5 g")).toBeInTheDocument();
    expect(screen.getByText("Added Creatine 5 g")).toBeInTheDocument();
  });
});
