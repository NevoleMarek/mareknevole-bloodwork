import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  it("returns the production browser security policy", () => {
    const headers = new Map(
      getSecurityHeaders(false).map(({ key, value }) => [key, value]),
    );

    expect(headers).toEqual(
      new Map([
        ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
        ["X-Content-Type-Options", "nosniff"],
        ["X-Frame-Options", "DENY"],
        ["Referrer-Policy", "strict-origin-when-cross-origin"],
        [
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=(), payment=()",
        ],
        [
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        ],
      ]),
    );
  });

  it("keeps production strict while allowing development HMR", () => {
    const production = new Map(
      getSecurityHeaders(false).map(({ key, value }) => [key, value]),
    );
    const development = new Map(
      getSecurityHeaders(true).map(({ key, value }) => [key, value]),
    );

    const productionCsp = production.get("Content-Security-Policy");
    const developmentCsp = development.get("Content-Security-Policy");

    expect(productionCsp).toContain("script-src 'self' 'unsafe-inline'");
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(developmentCsp).toContain("'unsafe-eval'");
    expect(productionCsp).toContain("connect-src 'self'");
    expect(developmentCsp).toContain("connect-src 'self' ws:");
    expect(productionCsp).toContain("frame-src 'self' blob:");
    expect(productionCsp).toContain("frame-ancestors 'none'");
    expect(productionCsp).toContain("object-src 'none'");
    expect(production.has("Strict-Transport-Security")).toBe(true);
    expect(development.has("Strict-Transport-Security")).toBe(false);
  });
});
