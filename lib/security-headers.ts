export type SecurityHeader = {
  key: string;
  value: string;
};

/**
 * Headers shared by every response served by the Next/OpenNext Worker.
 *
 * The app renders JSON-LD and Next's streamed runtime inline, so the CSP
 * intentionally permits inline scripts. All executable and connectable
 * resources otherwise remain same-origin; PDF previews use blob frames.
 */
export function getSecurityHeaders(
  isDevelopment = process.env.NODE_ENV !== "production",
): SecurityHeader[] {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:");
  }

  const headers: SecurityHeader[] = [
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        `script-src ${scriptSources.join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "font-src 'self' data:",
        `connect-src ${connectSources.join(" ")}`,
        "frame-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    },
  ];

  if (!isDevelopment) {
    headers.unshift({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
