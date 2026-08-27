import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SupplementEditor } from "@/components/admin/supplement-editor";
import { jsonResponse, requestPath } from "@/test/http";
import type { Supplement } from "@/types/bloodwork";

const supplement: Supplement = {
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

describe("SupplementEditor", () => {
  it("keeps an edit open and exposes retry after a rejected save", async () => {
    let updateRequests = 0;
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn((input: RequestInfo | URL) => {
      if (requestPath(input) === "/api/supplements/s1") {
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
      throw new Error(`Unexpected request: ${requestPath(input)}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(<SupplementEditor supplements={[supplement]} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Service unavailable",
    );
    expect(
      screen.getByRole("textbox", { name: "Supplement name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateRequests).toBe(2);
    expect(refresh).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("textbox", { name: "Supplement name" }),
    ).toBeNull();
  }, 15000);

  it("disables all mutation controls and ignores a duplicate save", async () => {
    let resolveUpdate!: (value: Response) => void;
    const pendingUpdate = new Promise<Response>((resolve) => {
      resolveUpdate = resolve;
    });
    const refresh = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn(() => pendingUpdate);
    vi.stubGlobal("fetch", fetch);

    render(<SupplementEditor supplements={[supplement]} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const save = screen.getByRole("button", { name: "Save" });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saving supplement");

    await act(async () => {
      resolveUpdate(new Response(null, { status: 204 }));
      await pendingUpdate;
    });
    expect(refresh).toHaveBeenCalledOnce();
  }, 15000);
});
