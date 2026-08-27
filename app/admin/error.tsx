"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-[40vh] flex-col items-start justify-center gap-3 px-4 py-12 sm:px-8"
    >
      <div
        role="alert"
        aria-live="assertive"
        className="admin-state-panel flex flex-col items-start gap-3 text-sm text-red-800"
      >
        <p>Could not load this admin page. Please try again.</p>
        <button type="button" className="button-secondary" onClick={reset}>
          Retry
        </button>
      </div>
    </main>
  );
}
