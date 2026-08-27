"use client";

import { apiErrorMessage } from "@/lib/effect/client";

/**
 * Turn transport errors into copy that is useful to an admin without exposing
 * an implementation-specific exception or response body.
 */
export function adminErrorMessage(cause: unknown, fallback: string): string {
  const message = apiErrorMessage(cause);
  return message === undefined ? fallback : `Error: ${message}`;
}

export function AdminErrorState({
  message,
  onRetry,
  retrying = false,
  retryLabel = "Retry",
}: {
  message: string;
  onRetry: () => void | Promise<void>;
  retrying?: boolean;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="admin-state-panel flex flex-col items-start gap-3 text-sm text-red-800"
    >
      <p>{message}</p>
      <button
        type="button"
        className="button-secondary"
        onClick={() => void onRetry()}
        disabled={retrying}
        aria-busy={retrying}
      >
        {retrying ? "Retrying…" : retryLabel}
      </button>
    </div>
  );
}
