import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Accordion } from "@/components/ui/accordion";

afterEach(cleanup);

describe("Accordion", () => {
  it("renders summary and hides content by default", () => {
    render(
      <Accordion summary="Click me">
        <p>Hidden content</p>
      </Accordion>,
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).not.toBeVisible();
  });

  it("shows content when clicked", async () => {
    const user = userEvent.setup();
    render(
      <Accordion summary="Click me">
        <p>Hidden content</p>
      </Accordion>,
    );
    await user.click(screen.getByText("Click me"));
    expect(screen.getByText("Hidden content")).toBeVisible();
  });
});
