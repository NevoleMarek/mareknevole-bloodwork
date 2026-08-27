import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminVocabularyPage from "@/app/admin/vocabulary/page";
import { jsonResponse, requestPath } from "@/test/http";

const entry = {
  key: "glucose",
  label: "Glucose",
  unit: "mmol/L",
  referenceRange: { min: 3.9, max: 5.5 },
  description: null,
  featured: true,
  visible: true,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AdminVocabularyPage", () => {
  it("shows a retryable error when the initial load is rejected", async () => {
    let requests = 0;
    const fetch = vi.fn(() => {
      requests += 1;
      return Promise.resolve(
        requests === 1
          ? jsonResponse(
              {
                _tag: "Bloodwork.ApiServiceUnavailable",
                error: "Service unavailable",
              },
              503,
            )
          : jsonResponse({ entries: [entry] }),
      );
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminVocabularyPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Service unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "Vocabulary" }),
    ).toBeInTheDocument();
    expect(requests).toBe(2);
  }, 15000);

  it("keeps the editor visible and retryable when a mutation fails", async () => {
    let mutationRequests = 0;
    let listRequests = 0;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      if (requestPath(input) === "/api/vocabulary") {
        listRequests += 1;
        return Promise.resolve(jsonResponse({ entries: [entry] }));
      }
      mutationRequests += 1;
      return Promise.resolve(
        mutationRequests === 1
          ? jsonResponse(
              {
                _tag: "Bloodwork.ApiServiceUnavailable",
                error: "Service unavailable",
              },
              503,
            )
          : new Response(null, { status: 204 }),
      );
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminVocabularyPage />);
    const checkbox = await screen.findByRole("checkbox", {
      name: "Show Glucose on dashboard",
    });

    fireEvent.click(checkbox);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Service unavailable",
    );
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mutationRequests).toBe(2);
    expect(listRequests).toBe(2);
  }, 15000);

  it("prevents duplicate vocabulary submissions while a request is pending", async () => {
    let resolveMutation!: (value: Response) => void;
    const pendingMutation = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });
    let listRequests = 0;
    const fetch = vi.fn((input: RequestInfo | URL) =>
      requestPath(input) === "/api/vocabulary"
        ? ((listRequests += 1),
          Promise.resolve(jsonResponse({ entries: [entry] })))
        : pendingMutation,
    );
    vi.stubGlobal("fetch", fetch);

    render(<AdminVocabularyPage />);
    const checkbox = await screen.findByRole("checkbox", {
      name: "Show Glucose on dashboard",
    });

    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Updating vocabulary visibility",
    );

    await act(async () => {
      resolveMutation(new Response(null, { status: 204 }));
      await pendingMutation;
    });
    expect(listRequests).toBe(2);
  }, 15000);
});
