import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HealthGridContent } from "@/components/dashboard/health-grid";
import { jsonResponse, requestPath } from "@/test/http";
import type { HealthData } from "@/types/health";

const health: HealthData = {
  metrics: [
    { date: "2000-01-01", metric: "weight", value: 82, unit: "kg" },
    { date: "9999-12-31", metric: "weight", value: 80, unit: "kg" },
    {
      date: "9999-12-31",
      metric: "blood_pressure_systolic",
      value: 120,
      unit: "mmHg",
    },
    {
      date: "9999-12-31",
      metric: "blood_pressure_diastolic",
      value: 80,
      unit: "mmHg",
    },
  ],
  configs: [
    {
      metric: "weight",
      label: "Weight",
      unit: "kg",
      aggregation: "avg",
      visible: true,
    },
    {
      metric: "blood_pressure_systolic",
      label: "Blood Pressure Systolic",
      unit: "mmHg",
      aggregation: "avg",
      visible: true,
    },
    {
      metric: "blood_pressure_diastolic",
      label: "Blood Pressure Diastolic",
      unit: "mmHg",
      aggregation: "avg",
      visible: true,
    },
  ],
};

let enterViewport: () => void;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  let callback: IntersectionObserverCallback = () => {};
  const observer: IntersectionObserver = {
    root: null,
    rootMargin: "1000px 0px",
    thresholds: [0],
    disconnect() {},
    observe() {},
    takeRecords() {
      return [];
    },
    unobserve() {},
  };
  class TestIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "1000px 0px";
    readonly thresholds = [0];

    constructor(next: IntersectionObserverCallback) {
      callback = next;
    }

    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
  enterViewport = () => {
    const rectangle = new DOMRect();
    const entry: IntersectionObserverEntry = {
      boundingClientRect: rectangle,
      intersectionRatio: 1,
      intersectionRect: rectangle,
      isIntersecting: true,
      rootBounds: null,
      target: document.body,
      time: 0,
    };
    act(() => {
      callback([entry], observer);
    });
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HealthGrid", () => {
  it("communicates when a period has no health measurements", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        metrics: [],
        configs: [
          {
            metric: "weight",
            label: "Weight",
            unit: "kg",
            aggregation: "avg",
            visible: true,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);

    render(<HealthGridContent requestedPeriod={null} />);
    enterViewport();

    expect(
      await screen.findByText(
        "No health measurements available for this period.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "No health measurements available for this period.",
    );
  });

  it("loads six months only when the section approaches the viewport", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(health));
    vi.stubGlobal("fetch", fetch);

    render(<HealthGridContent requestedPeriod={null} />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
    expect(screen.getByText("ALL")).toBeInTheDocument();

    enterViewport();
    expect(await screen.findByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(requestPath(fetch.mock.calls[0][0])).toBe(
      "/api/dashboard/health?period=6M",
    );
  });

  it("derives one month from cached six-month data", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(health));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<HealthGridContent requestedPeriod={null} />);
    enterViewport();
    expect(await screen.findByText("Weight")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "1M" }));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "1M" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.location.search).toBe("?period=1M");
  });

  it("follows period changes from browser navigation", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(health)));
    vi.stubGlobal("fetch", fetch);

    render(<HealthGridContent requestedPeriod={null} />);
    enterViewport();
    expect(await screen.findByText("Weight")).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, "", "/?period=1Y");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      fetch.mock.calls.some(
        ([input]) => requestPath(input) === "/api/dashboard/health?period=1Y",
      ),
    ).toBe(true);
  });

  it("does not preload full history when a touch scroll begins", () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(health)));
    vi.stubGlobal("fetch", fetch);

    render(<HealthGridContent requestedPeriod={null} />);
    const all = screen.getByRole("button", { name: "ALL" });
    fireEvent.pointerDown(all, { pointerType: "touch" });
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.pointerDown(all, { pointerType: "mouse" });
    expect(requestPath(fetch.mock.calls[0][0])).toBe(
      "/api/dashboard/health?period=ALL",
    );
  });
});
