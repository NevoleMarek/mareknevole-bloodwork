import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  config,
  publicDashboardUnavailableResponse,
  PUBLIC_DASHBOARD_RETRY_AFTER_SECONDS,
  PUBLIC_DASHBOARD_UNAVAILABLE_STATUS,
  middleware,
} from "@/middleware";

const CLOUDFLARE_CONTEXT = Symbol.for("__cloudflare-context__");
type ProbeDatabase = {
  prepare: (query: string) => {
    first: () => Promise<void>;
  };
};

afterEach(() => {
  Object.defineProperty(globalThis, CLOUDFLARE_CONTEXT, {
    configurable: true,
    value: undefined,
  });
});

function setDatabase(database: ProbeDatabase) {
  Object.defineProperty(globalThis, CLOUDFLARE_CONTEXT, {
    configurable: true,
    value: { env: { DB: database }, ctx: {} },
  });
}

describe("public dashboard outage response", () => {
  it("uses unavailable, non-cacheable, non-indexable HTTP semantics", async () => {
    const response = publicDashboardUnavailableResponse();

    expect(response.status).toBe(PUBLIC_DASHBOARD_UNAVAILABLE_STATUS);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("retry-after")).toBe(
      String(PUBLIC_DASHBOARD_RETRY_AFTER_SECONDS),
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("content-type")).toContain("text/html");

    const body = await response.text();
    expect(body).toContain('role="alert"');
    expect(body).toContain("Bloodwork is temporarily unavailable.");
    expect(body).toContain('<form action="/" method="get">');
    expect(body).not.toContain("D1");
  });

  it("runs for the public root without changing admin middleware coverage", () => {
    expect(config.matcher).toEqual(["/", "/admin/:path*"]);
  });

  it("continues the healthy public root without applying the admin redirect", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const prepare = vi.fn().mockReturnValue({ first });
    setDatabase({ prepare });

    const response = await middleware(
      new NextRequest("https://bloodwork.test/"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(prepare).toHaveBeenCalledWith("SELECT 1");
  });
});
