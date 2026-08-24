import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminDataPage from "@/app/admin/data/page";
import type { ExportData } from "@/lib/schemas/wire";
import type { ReadingPage } from "@/types/bloodwork";

type TestResponse<Data> = {
  ok: boolean;
  json: () => Promise<Data>;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminDataPage", () => {
  it("loads the first page through Strict Mode effect replay", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ entries: [], nextCursor: null }),
    });
    vi.stubGlobal("fetch", fetch);

    render(
      <StrictMode>
        <AdminDataPage />
      </StrictMode>,
    );

    expect(await screen.findByText("No readings yet.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/readings");
  });

  it("loads summaries first and full data only for export", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const fetch = vi.fn((url: string) => {
      if (url === "/api/readings") {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            entries: [
              {
                id: "r1",
                date: "2026-07-28",
                source: "panel.pdf",
                measurementCount: 1,
              },
            ],
            nextCursor: null,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
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
      });
    });
    vi.stubGlobal("fetch", fetch);

    const view = render(<AdminDataPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetch).toHaveBeenCalledWith("/api/readings");
    expect(fetch).not.toHaveBeenCalledWith("/api/data");
    const button = screen.getByRole("button", { name: "Copy as Markdown" });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/data");
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
    expect(fetch).toHaveBeenCalledTimes(2);
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("invokes the promised clipboard write before export data arrives", async () => {
    let resolveExport!: (value: TestResponse<ExportData>) => void;
    const pendingExport = new Promise<TestResponse<ExportData>>((resolve) => {
      resolveExport = resolve;
    });
    class TestClipboardItem {
      constructor(
        readonly data: Record<
          string,
          string | Blob | PromiseLike<string | Blob>
        >,
      ) {}
    }
    const write = vi.fn(async ([item]: TestClipboardItem[]) => {
      await item.data["text/plain"];
    });
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    const fetch = vi.fn((url: string) => {
      if (url === "/api/readings") {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ entries: [], nextCursor: null }),
        });
      }
      return pendingExport;
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminDataPage />);
    const button = await screen.findByRole("button", {
      name: "Copy as Markdown",
    });
    fireEvent.click(button);

    expect(fetch).toHaveBeenCalledWith("/api/data");
    expect(write).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExport({
        ok: true,
        json: async () => ({ vocabulary: { entries: [] }, readings: [] }),
      });
      await pendingExport;
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Markdown copied to clipboard.",
    );
  });

  it("discards a load-more result after deletion refreshes the first page", async () => {
    let resolveMore!: (value: TestResponse<ReadingPage>) => void;
    const pendingMore = new Promise<TestResponse<ReadingPage>>((resolve) => {
      resolveMore = resolve;
    });
    let firstPageRequests = 0;
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/readings?") && !init) return pendingMore;
      if (url === "/api/readings" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (url === "/api/readings") {
        firstPageRequests += 1;
        const entry =
          firstPageRequests === 1
            ? {
                id: "r1",
                date: "2026-07-28",
                source: "old.pdf",
                measurementCount: 1,
              }
            : {
                id: "r2",
                date: "2026-08-10",
                source: "new.pdf",
                measurementCount: 2,
              };
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            entries: [entry],
            nextCursor:
              firstPageRequests === 1
                ? { date: entry.date, id: entry.id }
                : null,
          }),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminDataPage />);
    expect(await screen.findByText("2026-07-28")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete reading from 2026-07-28" }),
    );
    expect(await screen.findByText("2026-08-10")).toBeInTheDocument();

    await act(async () => {
      resolveMore({
        ok: true,
        json: async () => ({
          entries: [
            {
              id: "stale",
              date: "2025-01-01",
              source: "stale.pdf",
              measurementCount: 3,
            },
          ],
          nextCursor: null,
        }),
      });
      await pendingMore;
    });

    expect(screen.queryByText("2025-01-01")).toBeNull();
    expect(screen.getByText("2026-08-10")).toBeInTheDocument();
  });

  it("does not cache an export that resolves after a deletion", async () => {
    let resolveExport!: (value: TestResponse<ExportData>) => void;
    const pendingExport = new Promise<TestResponse<ExportData>>((resolve) => {
      resolveExport = resolve;
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    let readingRequests = 0;
    let exportRequests = 0;
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/data") {
        exportRequests += 1;
        if (exportRequests === 1) return pendingExport;
        return Promise.resolve({
          ok: true,
          json: async () => ({ vocabulary: { entries: [] }, readings: [] }),
        });
      }
      if (url === "/api/readings" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (url === "/api/readings") {
        readingRequests += 1;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            entries:
              readingRequests === 1
                ? [
                    {
                      id: "old",
                      date: "2026-01-01",
                      source: "old.pdf",
                      measurementCount: 1,
                    },
                  ]
                : [],
            nextCursor: null,
          }),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminDataPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Copy as Markdown" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete reading from 2026-01-01" }),
    );
    expect(await screen.findByText("No readings yet.")).toBeInTheDocument();

    await act(async () => {
      resolveExport({
        ok: true,
        json: async () => ({
          vocabulary: { entries: [] },
          readings: [
            { date: "2026-01-01", source: "old.pdf", measurements: [] },
          ],
        }),
      });
      await pendingExport;
    });

    const copy = screen.getByRole("button", { name: "Copy as Markdown" });
    fireEvent.click(copy);
    await vi.waitFor(() => expect(exportRequests).toBe(2));
  });
});
