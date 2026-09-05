import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionNav } from "@/components/dashboard/section-nav";

describe("SectionNav", () => {
  it("provides keyboard-accessible native links to each dashboard section", async () => {
    const user = userEvent.setup();
    render(<SectionNav />);
    expect(
      screen.getByRole("navigation", { name: "Dashboard sections" }),
    ).toBeInTheDocument();
    for (const label of ["Metrics", "Health", "Supplements", "Changelog"]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `#${label.toLowerCase()}`,
      );
    }
    await user.tab();
    expect(screen.getByRole("link", { name: "Back to the top" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveFocus();
  });
});
