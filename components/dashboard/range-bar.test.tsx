import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RangeBar } from "@/components/dashboard/range-bar";

describe("RangeBar", () => {
  it("renders min and max labels", () => {
    render(<RangeBar value={92} min={70} max={100} status="normal" />);
    expect(screen.getByText("70")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders with different statuses", () => {
    const { container } = render(
      <RangeBar value={142} min={0} max={130} status="high" />,
    );
    const zone = container.querySelector("[data-testid='range-zone']");
    expect(zone).toBeInTheDocument();
  });
});
