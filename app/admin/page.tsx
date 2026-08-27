"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { adminErrorMessage } from "@/components/admin/admin-error-state";
import { runApi } from "@/lib/effect/client";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPending = useRef(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitPending.current) return;
    submitPending.current = true;
    setError("");
    setIsSubmitting(true);

    try {
      await runApi((client) =>
        client.session.create({ payload: { password } }),
      );
      router.push("/admin/data");
    } catch (cause) {
      setError(adminErrorMessage(cause, "Invalid password"));
    } finally {
      submitPending.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen w-full items-center justify-center px-4 py-12"
    >
      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
        className="surface-elevated w-full max-w-sm p-6 sm:p-8"
      >
        <div className="mb-8">
          <span
            aria-hidden="true"
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-semibold text-white shadow-sm"
          >
            B
          </span>
          <p className="eyebrow">Private workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Bloodwork admin
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Sign in to manage readings, biomarkers, and health data.
          </p>
        </div>
        <label
          htmlFor="admin-password"
          className="mb-2 block text-xs font-semibold text-zinc-700"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="field w-full"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary mt-5 w-full disabled:opacity-40"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
