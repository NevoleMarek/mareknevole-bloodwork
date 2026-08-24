import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import { describe, expect, it } from "vitest";

import { readRuntimeConfig } from "@/lib/effect/config";

describe("binding-backed application configuration", () => {
  it("reads deterministic bindings through Config recipes and redacts secrets", async () => {
    const config = await Effect.runPromise(
      readRuntimeConfig({
        ADMIN_PASSWORD: "admin-secret",
        GEMINI_API_KEY: "gemini-secret",
        NEXTJS_ENV: "test",
      }),
    );

    if (
      config.adminPassword === undefined ||
      config.geminiApiKey === undefined
    ) {
      throw new Error("expected both configured secrets");
    }
    expect(Redacted.value(config.adminPassword)).toBe("admin-secret");
    expect(Redacted.value(config.geminiApiKey)).toBe("gemini-secret");
    expect(String(config.adminPassword)).not.toContain("admin-secret");
    expect(String(config.geminiApiKey)).not.toContain("gemini-secret");
    expect(config.nodeEnvironment).toBe("test");
  });

  it("treats absent and empty bindings as missing without consulting process.env", async () => {
    const config = await Effect.runPromise(
      readRuntimeConfig({
        ADMIN_PASSWORD: "",
        GEMINI_API_KEY: undefined,
        NEXTJS_ENV: undefined,
      }),
    );

    expect(config.adminPassword).toBeUndefined();
    expect(config.geminiApiKey).toBeUndefined();
    expect(config.nodeEnvironment).toBeUndefined();
  });
});
