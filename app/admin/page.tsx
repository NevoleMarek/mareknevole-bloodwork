"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin/data");
    } else {
      setError("Invalid password");
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen w-full items-center justify-center px-4 py-12"
    >
      <form
        onSubmit={handleSubmit}
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
          className="field w-full"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" className="button-primary mt-5 w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}
