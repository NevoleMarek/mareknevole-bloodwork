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

    await user.click(
      screen.getByRole("button", { name: /Glucose: 95 mg\/dL/ }),
    );
    expect(await screen.findByText("Latest")).toBeInTheDocument();
    expect(requestPath(fetch.mock.calls[0][0])).toBe(
      "/api/biomarkers/glucose/trend?period=1Y",
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Glucose trend" }),
    );
    await user.click(
      screen.getByRole("button", { name: /Glucose: 95 mg\/dL/ }),
    );
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
    const buttons = screen.getAllByRole("button", { name: /Add to trends/ });

    fireEvent.pointerDown(buttons[0], { pointerType: "touch" });
    expect(fetch).not.toHaveBeenCalled();

    for (const button of buttons.slice(0, 10)) fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(10);

    fireEvent.pointerDown(buttons[10], { pointerType: "mouse" });
    expect(fetch).toHaveBeenCalledTimes(10);
  });
});
