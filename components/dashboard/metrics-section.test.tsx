import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetricsSection } from "@/components/dashboard/metrics-section";
import { jsonResponse, requestPath } from "@/test/http";
import type { VocabularyEntry } from "@/types/bloodwork";

const metric = {
  vocabularyKey: "glucose",
  label: "Glucose",
  value: 95,
  unit: "mg/dL",
  min: 70,
  max: 100,
  status: "normal" as const,
};

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: "Fasting glucose measures blood sugar.",
    featured: true,
    visible: true,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MetricsSection", () => {
  it("loads a selected trend once and reuses it", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        points: [
          { date: "2025-06-15", value: 92 },
          { date: "2025-09-15", value: 95 },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(
      <MetricsSection
        featured={[metric]}
        nonFeatured={[]}
        vocabulary={vocabulary}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Glucose/ }));
    expect(await screen.findByText("Latest")).toBeInTheDocument();
    expect(requestPath(fetch.mock.calls[0][0])).toBe(
      "/api/biomarkers/glucose/trend?period=1Y",
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Glucose trend" }),
    );
    await user.click(screen.getByRole("button", { name: /^Glucose/ }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not prefetch for touch scrolling or past the selection limit", () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetch);
    const metrics = Array.from({ length: 11 }, (_, index) => ({
      ...metric,
      vocabularyKey: `marker-${index}`,
      label: `Marker ${index}`,
    }));

    render(
      <MetricsSection
        featured={metrics}
        nonFeatured={[]}
        vocabulary={vocabulary}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /^Marker/ });

    fireEvent.pointerDown(buttons[0], { pointerType: "touch" });
    expect(fetch).not.toHaveBeenCalled();

    for (const button of buttons.slice(0, 10)) fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(10);

    fireEvent.pointerDown(buttons[10], { pointerType: "mouse" });
    expect(fetch).toHaveBeenCalledTimes(10);
  });

  it("names each card from its visible content, including the status", () => {
    render(
      <MetricsSection
        featured={[{ ...metric, value: 107, status: "high" }]}
        nonFeatured={[]}
        vocabulary={vocabulary}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^Glucose High 107/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("marks unselected toggles unavailable once the limit is reached", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    const metrics = Array.from({ length: 10 }, (_, index) => ({
      ...metric,
      vocabularyKey: `marker-${index}`,
      label: `Marker ${index}`,
    }));

    render(
      <MetricsSection
        featured={metrics}
        nonFeatured={[
          { ...metric, label: "Ferritin", vocabularyKey: "ferritin" },
          { ...metric, label: "Iron", vocabularyKey: "iron" },
        ]}
        vocabulary={vocabulary}
      />,
    );
    const cards = screen.getAllByRole("button", { name: /^Marker/ });
    const ferritin = screen.getByRole("button", { name: /^Ferritin/ });
    const iron = screen.getByRole("button", { name: /^Iron/ });
    for (const card of cards.slice(0, 9)) fireEvent.click(card);
    expect(screen.getByText("Select up to 10 to compare")).toBeInTheDocument();
    expect(cards[9]).not.toHaveAttribute("aria-disabled");
    expect(iron).not.toHaveAttribute("aria-disabled");

    fireEvent.click(ferritin);
    expect(
      screen.getByText("10 of 10 selected. Remove one to add another."),
    ).toBeInTheDocument();
    expect(cards[9]).toHaveAttribute("aria-disabled", "true");
    expect(iron).toHaveAttribute("aria-disabled", "true");
    for (const selected of [...cards.slice(0, 9), ferritin]) {
      expect(selected).toHaveAttribute("aria-pressed", "true");
      expect(selected).not.toHaveAttribute("aria-disabled");
    }

    fireEvent.click(cards[9]);
    expect(cards[9]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an empty trend as a removable message without Retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ points: [] })),
    );
    const user = userEvent.setup();
    render(
      <MetricsSection
        featured={[metric]}
        nonFeatured={[]}
        vocabulary={vocabulary}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Glucose/ }));
    expect(
      await screen.findByText("No Glucose results in the last 12 months."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Remove Glucose trend" }),
    );
    expect(
      screen.queryByText("No Glucose results in the last 12 months."),
    ).toBeNull();
  });

  it("recovers a failed trend through Retry and offers removal", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({ points: [{ date: "2025-09-15", value: 95 }] }),
      );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    render(
      <MetricsSection
        featured={[metric]}
        nonFeatured={[]}
        vocabulary={vocabulary}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Glucose/ }));
    expect(
      await screen.findByText("Could not load Glucose."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Glucose trend" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Latest")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
