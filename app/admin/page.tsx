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
    <main className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">ADMIN</h1>
        <p className="mb-6 text-[10px] tracking-widest text-zinc-400 uppercase">
          Bloodwork
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 w-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full border border-zinc-900 bg-zinc-900 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Login
        </button>
      </form>
    </main>
  );
}
