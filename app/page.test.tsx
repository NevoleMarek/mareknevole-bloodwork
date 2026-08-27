import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderHome } from "@/app/page";
import { PersistenceError } from "@/lib/effect/errors";
import type { DashboardSnapshot } from "@/types/bloodwork";

const emptyDashboard: DashboardSnapshot = {
  vocabulary: [],
  labs: {
    latestPanel: null,
    latestMeasurements: [],
    panelCount: 0,
  },
  supplements: [],
};

describe("public home page", () => {
  it("renders a safe retryable state when the root dashboard load is unavailable", async () => {
    const failure = new PersistenceError({
      operation: "DataCache.dashboard",
      cause: new Error("D1 database binding is unavailable"),
    });

    const page = await renderHome(
      () => Promise.reject(failure),
      async () => {},
    );
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bloodwork is temporarily unavailable.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(screen.queryByText(/D1 database binding/i)).not.toBeInTheDocument();

    const form = screen
      .getByRole("button", { name: "Try again" })
      .closest("form");
    expect(form).toHaveAttribute("action", "/");
    expect(form).toHaveAttribute("method", "get");
    fireEvent.submit(form!);
  });

  it("keeps rendering the dashboard after a successful root load", async () => {
    const page = await renderHome(
      () => Promise.resolve(emptyDashboard),
      async () => {},
    );

    expect(page).toMatchObject({
      type: "main",
      props: {
        id: "main-content",
        className: expect.stringContaining("max-w-[1180px]"),
      },
    });
  });
});
