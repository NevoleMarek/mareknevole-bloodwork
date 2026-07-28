import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionNav } from "@/components/dashboard/section-nav";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SectionNav", () => {
  it("moves immediately to a section while preserving the sticky-nav offset", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("scrollY", 320);

    render(
      <>
        <SectionNav />
        <section id="health" />
      </>,
    );

    const health = document.getElementById("health");
    expect(health).not.toBeNull();
    vi.spyOn(health!, "getBoundingClientRect").mockReturnValue({
      bottom: 620,
      height: 100,
      left: 0,
      right: 100,
      top: 520,
      width: 100,
      x: 0,
      y: 520,
      toJSON: () => ({}),
    });

    expect(
      screen.getByRole("navigation", { name: "Dashboard sections" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Health" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 728, behavior: "auto" });
  });
});
