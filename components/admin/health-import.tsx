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
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Import
      </div>
      {status === "idle" && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center border border-dashed border-zinc-300 px-4 py-10"
        >
          <span className="text-xs text-zinc-400">
            Drop health-data.json here
          </span>
          <span className="mt-1 text-[10px] text-zinc-300">
            or click to select
          </span>
          <input
            type="file"
            accept=".json"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}
      {status === "uploading" && (
        <div className="flex items-center justify-center border border-zinc-200 px-4 py-10">
          <span className="text-xs text-zinc-500">Uploading...</span>
        </div>
      )}
      {status === "done" && (
        <div className="flex items-center justify-center border border-zinc-200 px-4 py-10">
          <span className="text-xs text-zinc-500">{message}</span>
        </div>
      )}
      {status === "idle" && message && (
        <div className="mt-2 text-xs text-red-600">{message}</div>
      )}
    </div>
  );
}
