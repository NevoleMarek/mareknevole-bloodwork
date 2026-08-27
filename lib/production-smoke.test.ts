import { describe, expect, it } from "vitest";

import {
  PRODUCTION_SMOKE_MAX_ATTEMPTS,
  runProductionSmoke,
} from "@/lib/production-smoke";

const htmlResponse = () =>
  new Response("<!doctype html><html></html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const openApiResponse = () =>
  new Response(
    JSON.stringify({
      paths: {
        "/api/session": { post: {} },
        "/api/readings": { get: { security: [{ session: [] }] } },
      },
      components: {
        securitySchemes: {
          session: { type: "apiKey", in: "cookie", name: "bloodwork-session" },
        },
      },
    }),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );

const unauthorizedResponse = () =>
  new Response(JSON.stringify({ error: "Invalid session" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });

describe("production smoke checks", () => {
  it("uses only read-only requests and verifies the root, schema, and auth", async () => {
    const requests: Array<{
      readonly url: string;
      readonly method: string | undefined;
      readonly cookie: string | null;
      readonly hasBody: boolean;
    }> = [];

    const result = await runProductionSmoke({
      baseUrl: "https://bloodwork.test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push({
          url: request.url,
          method: request.method,
          cookie: request.headers.get("cookie"),
          hasBody: request.body !== null,
        });
        if (request.url.endsWith("/")) return htmlResponse();
        if (request.url.endsWith("/api/openapi.json")) {
          return openApiResponse();
        }
        return unauthorizedResponse();
      },
      sleep: async () => undefined,
    });

    expect(result.map(({ name }) => name)).toEqual([
      "public root",
      "OpenAPI contract",
      "authentication without a session",
      "authentication rejects an invalid session",
    ]);
    expect(requests).toHaveLength(4);
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
    expect(requests.every(({ hasBody }) => !hasBody)).toBe(true);
    expect(requests[0]?.cookie).toBeNull();
    expect(requests[1]?.cookie).toBeNull();
    expect(requests[2]?.cookie).toBeNull();
    expect(requests[3]?.cookie).toBe("bloodwork-session=invalid");
  });

  it("retries a transient live failure with bounded exponential delays", async () => {
    const attempts: string[] = [];
    const delays: number[] = [];

    const result = await runProductionSmoke({
      baseUrl: "https://bloodwork.test",
      maxAttempts: 3,
      retryDelayMs: 100,
      fetch: async (input) => {
        const url = String(input);
        attempts.push(url);
        if (attempts.length === 1) {
          return new Response("unavailable", { status: 503 });
        }
        if (url.endsWith("/")) return htmlResponse();
        if (url.endsWith("/api/openapi.json")) return openApiResponse();
        return unauthorizedResponse();
      },
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    expect(result[0]?.attempts).toBe(2);
    expect(delays).toEqual([100]);
    expect(attempts).toHaveLength(5);
  });

  it("fails after the configured attempt bound without leaking response data", async () => {
    const delays: number[] = [];

    await expect(
      runProductionSmoke({
        baseUrl: "https://bloodwork.test",
        fetch: async () =>
          new Response("contains no diagnostic output", {
            status: 500,
            headers: { "content-type": "text/plain" },
          }),
        sleep: async (milliseconds) => {
          delays.push(milliseconds);
        },
      }),
    ).rejects.toMatchObject({
      check: "public root",
      attempts: PRODUCTION_SMOKE_MAX_ATTEMPTS,
      reason: "unexpected-status",
    });

    expect(delays).toEqual([1000, 2000, 4000, 4000]);
  });

  it("bounds a fetcher that ignores abort and retries only within the limit", async () => {
    let attempts = 0;

    await expect(
      runProductionSmoke({
        baseUrl: "https://bloodwork.test",
        maxAttempts: 2,
        requestTimeoutMs: 1,
        retryDelayMs: 0,
        fetch: async () => {
          attempts += 1;
          return new Promise<Response>(() => undefined);
        },
        sleep: async () => undefined,
      }),
    ).rejects.toMatchObject({
      check: "public root",
      attempts: 2,
      reason: "request-failed",
    });

    expect(attempts).toBe(2);
  });
});
