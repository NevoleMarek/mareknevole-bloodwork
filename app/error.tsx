"use client";

type PublicErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Keep request-time failures on the public dashboard understandable and
 * retryable. The error itself is intentionally not rendered because it may
 * contain persistence details that are useful only in server logs.
 */
export default function Error({ reset }: PublicErrorProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] items-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <section
        role="alert"
        aria-labelledby="public-error-title"
        className="surface-elevated w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10"
      >
        <p className="eyebrow">Service unavailable</p>
        <h1
          id="public-error-title"
          className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl"
        >
          Bloodwork is temporarily unavailable.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
          We couldn&apos;t load the public dashboard right now. Please try again
          in a moment.
        </p>
        <button type="button" className="button-primary mt-6" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
