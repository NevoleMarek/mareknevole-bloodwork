"use client";

import { useRef, useState } from "react";
import {
  PDF_PROCESSING_CONSENT_FIELD,
  PDF_PROCESSING_CONSENT_VERSION,
  PDF_PROCESSING_NOTICE,
  PDF_PROCESSING_RETENTION_NOTICE,
  GOOGLE_GEMINI_ABUSE_POLICY_URL,
  GOOGLE_GEMINI_TERMS_URL,
} from "@/lib/privacy/pdf-processing";

export function StepUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [notice, setNotice] = useState("");

  function handleFile(file: File) {
    if (!hasConsent) {
      setNotice("Confirm the processing notice before choosing a PDF.");
      return;
    }
    if (file.type !== "application/pdf") {
      setNotice("Choose a PDF file.");
      return;
    }
    setNotice("");
    onUpload(file);
  }

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
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div className="rounded-2xl border border-amber-900/15 bg-amber-50/70 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Before uploading a report</p>
        <p className="mt-1">{PDF_PROCESSING_NOTICE}</p>
        <p className="mt-2">{PDF_PROCESSING_RETENTION_NOTICE}</p>
        <p className="mt-2">
          Review the current{" "}
          <a
            href={GOOGLE_GEMINI_TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Gemini API terms
          </a>{" "}
          and{" "}
          <a
            href={GOOGLE_GEMINI_ABUSE_POLICY_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            abuse-monitoring policy
          </a>{" "}
          before proceeding.
        </p>
        <p className="mt-2">
          Remove or redact identifiers first when they are not needed, and
          upload only a report you are authorized to share.
        </p>
        <label
          htmlFor={PDF_PROCESSING_CONSENT_FIELD}
          className="mt-4 flex cursor-pointer items-start gap-3 font-semibold"
        >
          <input
            id={PDF_PROCESSING_CONSENT_FIELD}
            name={PDF_PROCESSING_CONSENT_FIELD}
            type="checkbox"
            required
            checked={hasConsent}
            onChange={(event) => {
              setHasConsent(event.target.checked);
              if (event.target.checked) setNotice("");
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
          />
          <span>
            I have removed or redacted identifiers not needed for extraction,
            understand what is sent, and authorize this PDF to be processed by
            Google Gemini ({PDF_PROCESSING_CONSENT_VERSION}).
          </span>
        </label>
      </div>

      <label
        htmlFor="pdf-file"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        aria-disabled={!hasConsent}
        className={`mt-5 block ${hasConsent ? "cursor-pointer" : "cursor-not-allowed"}`}
      >
        <input
          ref={inputRef}
          id="pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          disabled={!hasConsent}
          className="peer sr-only"
        />
        <span
          data-drag-active={isDragging}
          className={`file-drop-shell flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/20 bg-zinc-50/65 p-8 text-center peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-700/20 ${hasConsent ? "" : "opacity-60"}`}
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
            {hasConsent
              ? "Drop a PDF here or choose one from your device."
              : "Confirm the processing notice above to choose a PDF."}
          </span>
          <span className="button-primary mt-5">Choose file</span>
        </span>
      </label>
      {notice && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {notice}
        </p>
      )}
    </div>
  );
}
