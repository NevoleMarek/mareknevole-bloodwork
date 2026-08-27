/**
 * Stable, non-sensitive marker used to identify the public dashboard's
 * persistence fallback after Next serializes an error for `app/error.tsx`.
 *
 * Do not include a database message or operation in this value: it can cross
 * the server/client boundary and is intentionally safe to expose.
 */
export const PUBLIC_DASHBOARD_UNAVAILABLE_DIGEST =
  "Bloodwork.PublicDashboardUnavailable";

export class PublicDashboardUnavailableError extends Error {
  readonly digest = PUBLIC_DASHBOARD_UNAVAILABLE_DIGEST;

  constructor() {
    super("The public dashboard is temporarily unavailable.");
    this.name = PUBLIC_DASHBOARD_UNAVAILABLE_DIGEST;
  }
}

export function isPublicDashboardUnavailableError(
  error: Error,
): error is PublicDashboardUnavailableError {
  return (
    error instanceof PublicDashboardUnavailableError ||
    ("digest" in error && error.digest === PUBLIC_DASHBOARD_UNAVAILABLE_DIGEST)
  );
}
