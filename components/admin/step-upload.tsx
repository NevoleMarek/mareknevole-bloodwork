"use client";

import { useRef, useState } from "react";

export function StepUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="block cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="peer sr-only"
      />
      <span
        data-drag-active={isDragging}
        className="file-drop-shell flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/20 bg-zinc-50/65 p-8 text-center peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-700/20"
      >
        <span
          aria-hidden="true"
          className="file-drop-glyph mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800"
        >
          ↑
        </span>
        <span className="text-base font-semibold text-zinc-900">
          Add a lab report
        </span>
        <span className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
          Drop a PDF here or choose one from your device.
        </span>
        <span className="button-primary mt-5">Choose file</span>
      </span>
    </label>
  );
}
