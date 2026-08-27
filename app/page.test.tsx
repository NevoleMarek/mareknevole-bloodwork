import { fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it, vi } from "vitest";

import PublicError from "@/app/error";
import { loadDashboardWithLayer, renderHome } from "@/app/page";
import { PersistenceError } from "@/lib/effect/errors";
import { Dashboard } from "@/lib/effect/services";
import { PublicDashboardUnavailableError } from "@/lib/public-dashboard-error";
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

const unused = () => Effect.die("unused dashboard operation");

const dashboard = (getDashboard: Dashboard["Service"]["getDashboard"]) =>
  Dashboard.of({
    getDashboard,
    getData: unused,
    getTrend: unused,
    getVisibleKeys: unused,
    getHealth: unused,
    getFirstChangelogPage: unused,
    getChangelogPage: unused,
    getReadingPage: unused,
  });

describe("public home page", () => {
  it("crosses the production loader boundary for persistence failures", async () => {
    const failure = new PersistenceError({
      operation: "DataCache.dashboard",
      cause: new Error("D1 database binding is unavailable"),
    });

    await expect(
      renderHome(
        loadDashboardWithLayer(
          Layer.succeed(
            Dashboard,
            dashboard(() => Effect.fail(failure)),
          ),
        ),
        async () => {},
      ),
    ).rejects.toBeInstanceOf(PublicDashboardUnavailableError);
  });

  it("renders the safe retryable state at the public error boundary", () => {
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

  it("keeps rendering the dashboard after a successful root load", async () => {
    const page = await renderHome(
      loadDashboardWithLayer(
        Layer.succeed(
          Dashboard,
          dashboard(() => Effect.succeed(emptyDashboard)),
        ),
      ),
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

  it("does not present non-persistence errors as a D1 outage", async () => {
    const failure = new Error("unexpected render failure");

    await expect(
      renderHome(
        () => Promise.reject(failure),
        async () => {},
      ),
    ).rejects.toBe(failure);

    render(<PublicError error={failure} reset={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load Bloodwork.",
    );
    expect(screen.queryByText(/Service unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/D1/i)).not.toBeInTheDocument();
  });
});
