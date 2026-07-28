import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminDataPage from "@/app/admin/data/page";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminDataPage", () => {
  it("announces copied state and restores the label after its dwell", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          vocabulary: {
            entries: [
              {
                key: "glucose",
                label: "Glucose",
                unit: "mmol/L",
                referenceRange: { min: 3.9, max: 5.5 },
                description: null,
                featured: true,
                visible: true,
              },
            ],
          },
          readings: [
            {
              date: "2026-07-28",
              source: "panel.pdf",
              measurements: [
                {
                  vocabularyKey: "glucose",
                  value: 4.8,
                  unit: "mmol/L",
                  status: "normal",
                },
              ],
            },
          ],
        }),
      }),
    );

    const view = render(<AdminDataPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const button = screen.getByRole("button", { name: "Copy as Markdown" });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("| Glucose | 4.8 | mmol/L | normal |"),
    );
    expect(button).toHaveAttribute("data-copied", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Markdown copied to clipboard.",
    );

    act(() => vi.advanceTimersByTime(1400));
    expect(button).toHaveAttribute("data-copied", "false");

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
