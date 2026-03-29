"use client";

import { useRef } from "react";

export function StepUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center border border-dashed border-zinc-300 p-16"
    >
      <p className="mb-4 text-xs text-zinc-500">
        Drop a PDF here or click to upload
      </p>
      <label className="cursor-pointer border border-zinc-900 px-4 py-1.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white">
        Choose File
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
