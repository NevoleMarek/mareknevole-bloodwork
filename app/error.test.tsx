import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PublicError from "@/app/error";

describe("public error boundary", () => {
  it("renders a safe retryable state without exposing the error", () => {
    const reset = vi.fn();

    render(
      <PublicError
        error={new Error("D1 database binding is unavailable")}
        reset={reset}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bloodwork is temporarily unavailable.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(screen.queryByText(/D1 database binding/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
