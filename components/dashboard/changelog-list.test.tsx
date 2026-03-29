import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import type { SupplementChangelog } from "@/types/bloodwork";

function makeEntries(count: number): SupplementChangelog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    date: `2025-06-${String(15 - Math.floor(i / 3)).padStart(2, "0")}`,
    description: `Entry ${i}`,
    createdAt: "2025-06-01T00:00:00Z",
  }));
}

describe("ChangelogList", () => {
  it("groups entries by date, showing date only on first of each group", () => {
    const entries: SupplementChangelog[] = [
      {
        id: "c1",
        date: "2025-06-15",
        description: "Added Creatine",
        createdAt: "2025-06-15T00:00:00Z",
      },
      {
        id: "c2",
        date: "2025-06-15",
        description: "Changed Vitamin D",
        createdAt: "2025-06-15T00:00:00Z",
      },
      {
        id: "c3",
        date: "2025-06-10",
        description: "Added Fish Oil",
        createdAt: "2025-06-10T00:00:00Z",
      },
    ];
    render(<ChangelogList changelog={entries} />);
    const dates = screen.getAllByTestId("changelog-date");
    expect(dates[0]).toHaveTextContent("2025-06-15");
    expect(dates[1]).toHaveTextContent("");
    expect(dates[2]).toHaveTextContent("2025-06-10");
  });

  it("shows only 20 entries initially", () => {
    render(<ChangelogList changelog={makeEntries(25)} />);
    expect(screen.getAllByTestId("changelog-entry")).toHaveLength(20);
    expect(screen.getByText("Load more")).toBeInTheDocument();
  });

  it("loads more entries on button click", async () => {
    const user = userEvent.setup();
    render(<ChangelogList changelog={makeEntries(25)} />);
    await user.click(screen.getByText("Load more"));
    expect(screen.getAllByTestId("changelog-entry")).toHaveLength(25);
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });

  it("hides load more when all entries shown", () => {
    render(<ChangelogList changelog={makeEntries(10)} />);
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });
});
