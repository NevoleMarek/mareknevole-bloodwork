import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin page authentication redirect", () => {
  it("uses the canonical production origin for an attacker-controlled host", () => {
    vi.stubEnv("NEXTJS_ENV", "production");
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

  it.each([
    ["Host", { host: "https://attacker.example" }],
    ["malformed Host", { host: "localhost:4312, attacker.example" }],
    ["forwarded host", { "x-forwarded-host": "attacker.example" }],
    [
      "malformed forwarded host",
      { "x-forwarded-host": "localhost:4312, attacker.example" },
    ],
    ["Origin", { origin: "https://attacker.example" }],
    ["malformed Origin", { origin: "https://[attacker.example" }],
  ])(
    "ignores an independently attacker-controlled %s header",
    (_headerName, headers) => {
      vi.stubEnv("NEXTJS_ENV", "production");
      const request = new NextRequest(
        "https://bloodwork.mareknevole.com/admin/data",
        { headers },
      );

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://bloodwork.mareknevole.com/admin",
      );
    },
  );

  it.each([
    [
      "an attacker hostname",
      "https://attacker.example/admin/data",
      { host: "attacker.example" },
    ],
    [
      "a malformed hostname",
      "https://localhost;attacker.example/admin/data",
      { host: "localhost;attacker.example" },
    ],
    [
      "a local lookalike hostname",
      "http://localhost.evil.example/admin/data",
      { host: "localhost.evil.example" },
    ],
    [
      "a trailing-dot local hostname",
      "http://localhost.:4312/admin/data",
      { host: "localhost.:4312" },
    ],
  ])(
    "falls back to production for %s even with attacker-controlled forwarding headers",
    (_caseName, url, headers) => {
      vi.stubEnv("NEXTJS_ENV", "development");
      const request = new NextRequest(url, {
        headers: {
          ...headers,
          origin: "https://attacker.example",
          "x-forwarded-host": "attacker.example",
        },
      });

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://bloodwork.mareknevole.com/admin",
      );
    },
  );

  it.each([
    ["Origin", { origin: "https://attacker.example" }],
    ["forwarded host", { "x-forwarded-host": "attacker.example" }],
  ])(
    "preserves the allowed local origin when %s is attacker-controlled",
    (_headerName, headers) => {
      vi.stubEnv("NEXTJS_ENV", "development");
      const request = new NextRequest("http://localhost:4312/admin/data", {
        headers,
      });

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:4312/admin",
      );
    },
  );

  it("preserves the local development origin for a loopback request", () => {
    vi.stubEnv("NEXTJS_ENV", "development");
    const request = new NextRequest("http://localhost:4312/admin/data", {
      headers: {
        host: "localhost:4312",
      },
    });

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:4312/admin",
    );
  });

  it("uses the canonical production origin outside local development", () => {
    vi.stubEnv("NEXTJS_ENV", "production");
    const request = new NextRequest("http://localhost:4312/admin/data", {
      headers: {
        host: "localhost:4312",
        origin: "http://localhost:4312",
        "x-forwarded-host": "localhost:4312",
      },
    });

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://bloodwork.mareknevole.com/admin",
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
