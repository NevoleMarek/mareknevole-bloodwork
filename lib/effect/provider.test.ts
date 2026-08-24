import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { generateContentWithSignal } from "@/lib/effect/provider";

describe("Gemini adapter cancellation", () => {
  it("forwards the Effect tryPromise AbortSignal to generateContent", async () => {
    let receivedSignal: AbortSignal | undefined;
    const model = {
      generateContent: (
        _request: Parameters<typeof generateContentWithSignal>[1],
        options?: { readonly signal?: AbortSignal },
      ) => {
        receivedSignal = options?.signal;
        return Promise.reject(new Error("sentinel"));
      },
    };

    const request = Effect.tryPromise({
      try: (signal) => generateContentWithSignal(model, "prompt", signal),
      catch: (cause) => cause,
    });

    await expect(Effect.runPromise(request)).rejects.toThrow("sentinel");
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });
});
