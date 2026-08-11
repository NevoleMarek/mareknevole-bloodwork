import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import type { ChangelogPage, SupplementChangelog } from "@/types/bloodwork";

function makeEntries(count: number, offset = 0): SupplementChangelog[] {
  return Array.from({ length: count }, (_, index) => {
    const value = index + offset;
    return {
      id: `c${value}`,
      date: `2025-06-${String(15 - Math.floor(value / 3)).padStart(2, "0")}`,
      description: `Entry ${value}`,
      createdAt: `2025-06-01T00:00:${String(59 - value).padStart(2, "0")}Z`,
    };
  });
}

let enterViewport: () => void;

beforeEach(() => {
  let callback: IntersectionObserverCallback;
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
    act(() => {
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChangelogList", () => {
  it("loads and groups the first page near the viewport", async () => {
    const entries = makeEntries(3);
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ entries, nextCursor: null }),
    });
    vi.stubGlobal("fetch", fetch);

    render(<ChangelogList />);
    expect(fetch).not.toHaveBeenCalled();
    enterViewport();

    expect(await screen.findAllByTestId("changelog-entry")).toHaveLength(3);
    const dates = screen.getAllByTestId("changelog-date");
    expect(dates[0]).toHaveTextContent(entries[0].date);
    expect(dates[1]).toHaveTextContent("");
    expect(fetch).toHaveBeenCalledWith("/api/public/changelog");
  });

  it("appends the next cursor page", async () => {
    const firstEntries = makeEntries(20);
    const cursor = {
      date: firstEntries[19].date,
      createdAt: firstEntries[19].createdAt,
      id: firstEntries[19].id,
    };
    const pages: ChangelogPage[] = [
      { entries: firstEntries, nextCursor: cursor },
      { entries: makeEntries(5, 20), nextCursor: null },
    ];
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(pages[0]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(pages[1]),
      });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<ChangelogList />);
    enterViewport();
    expect(await screen.findAllByTestId("changelog-entry")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findAllByTestId("changelog-entry")).toHaveLength(25);
    const params = new URLSearchParams(cursor);
    expect(fetch).toHaveBeenNthCalledWith(2, `/api/public/changelog?${params}`);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("consumes a resolved pointer prefetch only once", async () => {
    const firstEntries = makeEntries(20);
    const secondEntries = makeEntries(5, 20);
    const firstCursor = {
      date: firstEntries[19].date,
      createdAt: firstEntries[19].createdAt,
      id: firstEntries[19].id,
    };
    const secondCursor = {
      date: secondEntries[4].date,
      createdAt: secondEntries[4].createdAt,
      id: secondEntries[4].id,
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          entries: firstEntries,
          nextCursor: firstCursor,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          entries: secondEntries,
          nextCursor: secondCursor,
        }),
      });
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();

    render(<ChangelogList />);
    enterViewport();
    expect(await screen.findAllByTestId("changelog-entry")).toHaveLength(20);

    const button = screen.getByRole("button", { name: "Load more" });
    fireEvent.pointerDown(button, { pointerType: "mouse" });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.getAllByTestId("changelog-entry")).toHaveLength(20);

    await user.click(button);
    expect(await screen.findAllByTestId("changelog-entry")).toHaveLength(25);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
