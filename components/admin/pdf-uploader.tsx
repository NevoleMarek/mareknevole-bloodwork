"use client";

import { useState } from "react";

type UploadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export function PdfUploader({ onSuccess }: { onSuccess: () => void }) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  async function handleUpload(file: File) {
    setState({ kind: "loading" });
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/extract", { method: "POST", body: formData });
    if (res.ok) {
      setState({ kind: "done" });
      onSuccess();
    } else {
      const data = (await res.json()) as { error?: string };
      setState({ kind: "error", message: data.error ?? "Upload failed" });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handleUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border border-dashed border-zinc-300 p-8 text-center"
    >
      {state.kind === "loading" && (
        <p className="text-xs text-zinc-500">Extracting...</p>
      )}
      {state.kind === "done" && (
        <p className="text-xs text-zinc-500">Done! Reading added.</p>
      )}
      {state.kind === "error" && (
        <p className="text-xs text-red-400">{state.message}</p>
      )}
      {state.kind === "idle" && (
        <>
          <p className="mb-2 text-xs text-zinc-500">
            Drop a PDF here or click to upload
          </p>
          <label className="cursor-pointer border border-zinc-900 px-4 py-1.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white">
            Choose File
            <input
              type="file"
              accept=".pdf"
              onChange={handleChange}
              className="hidden"
            />
          </label>
        </>
      )}
    </div>
  );
}
