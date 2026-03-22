import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeDashboard } from "@/components/home-dashboard";

describe("HomeDashboard", () => {
  it("renders the starter heading and fast-check commands", () => {
    render(<HomeDashboard />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /bloodwork is ready for rapid local development/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/run bun run check during everyday development/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use bun run check:full before larger milestones/i),
    ).toBeInTheDocument();
  });
});
