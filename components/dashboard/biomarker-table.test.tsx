import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BiomarkerTable } from "@/components/dashboard/biomarker-table";

const metrics = [
  {
    vocabularyKey: "tsh",
    label: "TSH",
    value: 2.1,
    unit: "mIU/L",
    min: 0.4,
    max: 4.0,
    status: "normal" as const,
  },
  {
    vocabularyKey: "vitd",
    label: "Vitamin D",
    value: 28,
    unit: "ng/mL",
    min: 30,
    max: 100,
    status: "low" as const,
  },
];

describe("BiomarkerTable", () => {
  it("renders all biomarker rows", () => {
    render(
      <BiomarkerTable
        metrics={metrics}
        selected={[]}
        onToggle={() => {}}
        onIntent={() => {}}
      />,
    );
    expect(screen.getByText("TSH")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D")).toBeInTheDocument();
    expect(screen.getByText("2.1")).toBeInTheDocument();
    expect(screen.getByText("0.4 – 4")).toBeInTheDocument();
  });

  it("highlights selected rows", () => {
    const { container } = render(
      <BiomarkerTable
        metrics={metrics}
        selected={["tsh"]}
        onToggle={() => {}}
        onIntent={() => {}}
      />,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0].className).toContain("bg-zinc-50");
    expect(rows[1].className).not.toContain("bg-zinc-50");
  });

  it("keeps row and column semantics and exposes a keyboard action", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <BiomarkerTable
        metrics={metrics}
        selected={[]}
        onToggle={onToggle}
        onIntent={() => {}}
      />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(5);
    expect(
      within(table).getByRole("rowheader", { name: "TSH" }),
    ).toHaveAttribute("scope", "row");

    const action = within(table).getByRole("button", {
      name: /TSH: 2\.1 mIU\/L, In range\. Add to trends/,
    });
    action.focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith("tsh");
  });
});
