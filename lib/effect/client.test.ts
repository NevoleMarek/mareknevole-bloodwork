// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { runApi } from "@/lib/effect/client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Effect API client cancellation", () => {
  it("interrupts an in-flight request when its external signal aborts", async () => {
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { origin: "https://bloodwork.test" });

    const controller = new AbortController();
    const request = runApi(
      (client) => client.dashboard.health({ query: { period: "1Y" } }),
      { signal: controller.signal },
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    controller.abort();

    await expect(request).rejects.toThrow();
    expect(requestSignal).toBeInstanceOf(AbortSignal);
    expect(requestSignal?.aborted).toBe(true);
  });
});
