"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ReadingsTable } from "@/components/admin/readings-table";
import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

type DataState =
  | { kind: "loading" }
  | {
      kind: "ready";
      vocabulary: VocabularyEntry[];
      readings: BloodworkReading[];
    };

async function loadData(): Promise<DataState> {
  const res = await fetch("/api/data");
  const json = (await res.json()) as {
    vocabulary: { entries: VocabularyEntry[] };
    readings: BloodworkReading[];
  };
  return {
    kind: "ready",
    vocabulary: json.vocabulary.entries,
    readings: json.readings,
  };
}

export default function AdminDataPage() {
  const [data, setData] = useState<DataState>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const didFetch = useRef(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadData().then(setData);
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setData(await loadData());
  }, []);

  if (data.kind === "loading") {
    return (
      <p role="status" className="text-sm text-zinc-500">
        Loading readings…
      </p>
    );
  }

  async function handleExportMarkdown() {
    if (data.kind !== "ready") return;
    const lines: string[] = [];
    for (const r of data.readings) {
      lines.push(`## ${r.date} (${r.source})\n`);
      lines.push("| Marker | Value | Unit | Status |");
      lines.push("|---|---|---|---|");
      for (const m of r.measurements) {
        const v = data.vocabulary.find((e) => e.key === m.vocabularyKey);
        lines.push(
          `| ${v?.label ?? m.vocabularyKey} | ${m.value} | ${m.unit} | ${m.status} |`,
        );
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1400);
  }

  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Source records</p>
        <h1 className="mt-2">Readings</h1>
        <p>Review imported panels or export the dataset as structured text.</p>
      </div>
      <section className="admin-panel">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-800">
            {data.readings.length} lab panels
          </p>
          <button
            type="button"
            onClick={handleExportMarkdown}
            aria-label="Copy as Markdown"
            data-copied={copied}
            className="button-secondary copy-markdown-button"
          >
            <span aria-hidden="true" className="copy-label-stack">
              <span className="copy-label copy-label-default">
                Copy as Markdown
              </span>
              <span className="copy-label copy-label-confirmed">Copied</span>
            </span>
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Markdown copied to clipboard." : ""}
          </span>
        </div>
        <ReadingsTable
          readings={data.readings}
          onDelete={async (date) => {
            await fetch("/api/readings", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date }),
            });
            await refresh();
          }}
        />
      </section>
    </>
  );
}
