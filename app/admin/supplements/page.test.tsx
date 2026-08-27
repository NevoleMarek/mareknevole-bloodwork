import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminSupplementsPage from "@/app/admin/supplements/page";
import { jsonResponse, requestPath } from "@/test/http";

const supplement = {
  id: "s1",
  name: "Creatine",
  dose: "5 g",
  frequency: "daily",
  startedAt: "2026-01",
  stoppedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminSupplementsPage", () => {
  it("shows a retryable error when supplements cannot be loaded", async () => {
    let supplementRequests = 0;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/supplements") {
        supplementRequests += 1;
        return Promise.resolve(
          supplementRequests === 1
            ? jsonResponse(
                {
                  _tag: "Bloodwork.ApiServiceUnavailable",
                  error: "Service unavailable",
                },
                503,
              )
            : jsonResponse({ supplements: [supplement] }),
        );
      }
      if (path === "/api/changelog") {
        return Promise.resolve(jsonResponse({ entries: [], nextCursor: null }));
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminSupplementsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Service unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "Supplements" }),
    ).toBeInTheDocument();
    expect(supplementRequests).toBe(2);
  }, 15000);

  it("keeps a changelog edit open and retryable when saving fails", async () => {
    const changelog = {
      id: "c1",
      date: "2026-07-28",
      description: "Added creatine",
      createdAt: "2026-07-28T00:00:00Z",
    };
    let updateRequests = 0;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/supplements") {
        return Promise.resolve(jsonResponse({ supplements: [] }));
      }
      if (path === "/api/changelog/c1") {
        updateRequests += 1;
        return Promise.resolve(
          updateRequests === 1
            ? jsonResponse(
                {
                  _tag: "Bloodwork.ApiServiceUnavailable",
                  error: "Service unavailable",
                },
                503,
              )
            : new Response(null, { status: 204 }),
        );
      }
      if (path === "/api/changelog") {
        return Promise.resolve(
          jsonResponse({ entries: [changelog], nextCursor: null }),
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminSupplementsPage />);
    expect(await screen.findByText("Added creatine")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit change from 2026-07-28" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Service unavailable",
    );
    expect(
      screen.getByRole("textbox", { name: "Changelog description" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await vi.waitFor(() => expect(updateRequests).toBe(2));
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: "Changelog description" }),
      ).toBeNull(),
    );
  }, 15000);
});
