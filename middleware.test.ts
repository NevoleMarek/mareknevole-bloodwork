import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin page authentication redirect", () => {
  it("uses the canonical production origin instead of request host input", () => {
    const request = new NextRequest(
      "https://bloodwork.mareknevole.com.evil.example/admin/data",
      {
        headers: {
          host: "bloodwork.mareknevole.com.evil.example",
          origin: "https://attacker.example",
          "x-forwarded-host": "attacker.example",
        },
      },
    );

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://bloodwork.mareknevole.com/admin",
    );
  });

  it("preserves the local development origin for loopback requests", () => {
    vi.stubEnv("NEXTJS_ENV", "development");
    const request = new NextRequest("http://localhost:4312/admin/data", {
      headers: {
        host: "localhost:4312",
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
      },
    });

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:4312/admin",
    );
  });

  it("does not treat a lookalike loopback hostname as local", () => {
    vi.stubEnv("NEXTJS_ENV", "development");
    const request = new NextRequest(
      "http://localhost.evil.example/admin/data",
      {
        headers: {
          host: "localhost.evil.example",
          origin: "https://attacker.example",
          "x-forwarded-host": "attacker.example",
        },
      },
    );

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://bloodwork.mareknevole.com/admin",
    );
  });
});
