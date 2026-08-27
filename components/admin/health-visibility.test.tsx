import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HealthVisibility } from "@/components/admin/health-visibility";
import { jsonResponse } from "@/test/http";
import type { HealthMetricConfig } from "@/types/health";

const configs: HealthMetricConfig[] = [
  {
    metric: "weight",
    label: "Weight",
    unit: "kg",
    aggregation: "avg",
    visible: false,
  },
  {
    metric: "steps",
    label: "Steps",
    unit: "count",
    aggregation: "sum",
    visible: true,
  },
];

const noContent = () => new Response(null, { status: 204 });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HealthVisibility", () => {
  it("keeps the authoritative value and offers retry when saving fails", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          _tag: "Bloodwork.ApiServiceUnavailable",
          error: "Service unavailable",
        },
        503,
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<HealthVisibility configs={configs} />);
    const weight = screen.getByRole("button", { name: "Weight" });

    await user.click(weight);

    expect(weight).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("1 of 2 shown")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update dashboard visibility: Service unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("serializes visibility mutations while one mutation is pending", async () => {
    let resolvePatch: (response: Response) => void = () => {};
    const fetch = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolvePatch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetch);

    render(<HealthVisibility configs={configs} />);
    const weight = screen.getByRole("button", { name: "Weight" });
    const steps = screen.getByRole("button", { name: "Steps" });

    fireEvent.click(weight);
    fireEvent.click(steps);

    expect(fetch).toHaveBeenCalledOnce();
    expect(weight).toBeDisabled();
    expect(steps).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saving visibility…");

    await act(async () => {
      resolvePatch(noContent());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(weight).toHaveAttribute("aria-pressed", "true");
    expect(steps).toHaveAttribute("aria-pressed", "true");
    expect(weight).toBeEnabled();
    expect(steps).toBeEnabled();
  });

  it("uses the refetched configuration after a successful mutation", async () => {
    const fetch = vi.fn().mockResolvedValue(noContent());
    vi.stubGlobal("fetch", fetch);
    const authoritative = configs.map((config) => ({
      ...config,
      visible: config.metric === "steps",
    }));
    const onRefresh = vi.fn().mockResolvedValue(authoritative);
    const user = userEvent.setup();

    render(<HealthVisibility configs={configs} onRefresh={onRefresh} />);
    await user.click(screen.getByRole("button", { name: "Weight" }));

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("1 of 2 shown")).toBeInTheDocument();
  });

  it("keeps the last known state and offers retry when refetch fails", async () => {
    const fetch = vi.fn().mockResolvedValue(noContent());
    const onRefresh = vi
      .fn<() => Promise<HealthMetricConfig[]>>()
      .mockRejectedValueOnce(new Error("Network unavailable"));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<HealthVisibility configs={configs} onRefresh={onRefresh} />);
    await user.click(screen.getByRole("button", { name: "Weight" }));

    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update dashboard visibility: Network unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();

    onRefresh.mockResolvedValueOnce(
      configs.map((config) =>
        config.metric === "weight" ? { ...config, visible: true } : config,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("adopts later imported or refetched props", async () => {
    const view = render(<HealthVisibility configs={configs} />);
    const refreshed = configs.map((config) => ({
      ...config,
      visible: config.metric === "weight",
    }));

    view.rerender(<HealthVisibility configs={refreshed} />);

    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Steps" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("1 of 2 shown")).toBeInTheDocument();
  });

  it("does not resurrect a provisional state after a newer snapshot", async () => {
    const fetch = vi.fn().mockResolvedValue(noContent());
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    const view = render(<HealthVisibility configs={configs} />);

    await user.click(screen.getByRole("button", { name: "Weight" }));
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const newer = configs.map((config) => ({
      ...config,
      visible: config.metric === "steps",
    }));
    view.rerender(<HealthVisibility configs={newer} />);
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    view.rerender(<HealthVisibility configs={configs} />);
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Steps" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("retries the requested value after a failed mutation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            _tag: "Bloodwork.ApiServiceUnavailable",
            error: "Service unavailable",
          },
          503,
        ),
      )
      .mockResolvedValueOnce(noContent());
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<HealthVisibility configs={configs} />);
    await user.click(screen.getByRole("button", { name: "Weight" }));
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Weight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
