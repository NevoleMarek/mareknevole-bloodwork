"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string };

export function PdfUploader() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("pdf") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) return;

    setState({ kind: "loading" });

    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ kind: "error", message: body.error ?? "Extraction failed" });
      return;
    }

    const { text } = await res.json();
    setState({ kind: "done", text });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-300">
            Upload bloodwork PDF
          </span>
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            required
            className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cyan-400/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-cyan-100 hover:file:bg-cyan-400/30"
          />
        </label>
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="w-fit rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === "loading" ? "Extracting…" : "Extract"}
        </button>
      </form>

      {state.kind === "error" && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      {state.kind === "done" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="mb-3 text-xs font-medium tracking-widest text-zinc-400 uppercase">
            Extracted results
          </p>
          <pre className="text-sm leading-7 whitespace-pre-wrap text-zinc-200">
            {state.text}
          </pre>
        </div>
      )}
    </div>
  );
}
