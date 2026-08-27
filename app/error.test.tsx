import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PublicError from "@/app/error";
import { PublicDashboardUnavailableError } from "@/lib/public-dashboard-error";

describe("public error boundary", () => {
  it("renders a safe retryable state without exposing the error", () => {
    const reset = vi.fn();

    render(
      <PublicError
        error={new PublicDashboardUnavailableError()}
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

  it("keeps unrelated errors out of the service-unavailable state", () => {
    render(<PublicError error={new Error("render failed")} reset={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load Bloodwork.",
    );
    expect(screen.queryByText(/Service unavailable/i)).not.toBeInTheDocument();
  });
});
