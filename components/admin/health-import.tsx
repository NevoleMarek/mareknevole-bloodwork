"use client";

import { useCallback, useState } from "react";

type Status = "idle" | "uploading" | "done";

export function HealthImport({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      const body = await file.text();
      const res = await fetch("/api/health-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await res.json()) as {
        error?: string;
        saved?: number;
        metrics?: number;
        days?: number;
      };
      if (!res.ok) {
        setMessage(`Error: ${data.error}`);
        setStatus("idle");
        return;
      }
      setMessage(`Imported ${data.metrics} metrics, ${data.days} days`);
      setStatus("done");
      onImported();
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    },
    [onImported],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <section className="admin-panel">
      <h2 className="text-sm font-semibold text-zinc-800">
        Import health data
      </h2>
      <p className="mt-1 mb-5 text-sm text-zinc-500">
        Add a Health Auto Export JSON file to refresh the dashboard.
      </p>
      {status === "idle" && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="block cursor-pointer"
        >
          <input
            type="file"
            accept=".json"
            onChange={handleChange}
            className="peer sr-only"
          />
          <span className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/20 bg-zinc-50/70 px-4 text-center peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-700/20">
            <span
              aria-hidden="true"
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-800"
            >
              +
            </span>
            <span className="text-sm font-semibold text-zinc-800">
              Drop health-data.json here
            </span>
            <span className="mt-1 text-xs text-zinc-500">or choose a file</span>
          </span>
        </label>
      )}
      {status === "uploading" && (
        <div
          role="status"
          className="flex min-h-40 items-center justify-center rounded-2xl bg-zinc-50 px-4"
        >
          <span className="text-sm text-zinc-600">Uploading…</span>
        </div>
      )}
      {status === "done" && (
        <div
          role="status"
          className="flex min-h-40 items-center justify-center rounded-2xl bg-emerald-50 px-4"
        >
          <span className="text-sm font-medium text-emerald-900">
            {message}
          </span>
        </div>
      )}
      {status === "idle" && message && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          {message}
        </div>
      )}
    </section>
  );
}
