"use client";

import { isPublicDashboardUnavailableError } from "@/lib/public-dashboard-error";

type PublicErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Keep request-time failures on the public dashboard understandable and
 * retryable. The error itself is intentionally not rendered because it may
 * contain persistence details that are useful only in server logs.
 */
export default function Error({ error, reset }: PublicErrorProps) {
  const isUnavailable = isPublicDashboardUnavailableError(error);

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <main
        id="main-content"
        className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] items-center px-4 py-16 sm:px-6 lg:px-8"
      >
        <section
          role="alert"
          aria-labelledby="public-error-title"
          aria-describedby="public-error-description"
          className="surface-elevated w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10"
        >
          <p className="eyebrow">
            {isUnavailable ? "Service unavailable" : "Something went wrong"}
          </p>
          <h1
            id="public-error-title"
            className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl"
          >
            {isUnavailable
              ? "Bloodwork is temporarily unavailable."
              : "We couldn't load Bloodwork."}
          </h1>
          <p
            id="public-error-description"
            className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base"
          >
            {isUnavailable
              ? "We couldn't load the public dashboard right now. Please try again in a moment."
              : "Something went wrong while loading the public dashboard. Please try again."}
          </p>
          <button type="button" className="button-primary mt-6" onClick={reset}>
            Try again
          </button>
        </section>
      </main>
    </>
  );
}
