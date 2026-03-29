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
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadData().then(setData);
  }, []);

  const refresh = useCallback(async () => {
    setData(await loadData());
  }, []);

  if (data.kind === "loading") {
    return <p className="text-xs text-zinc-400">Loading...</p>;
  }

  function handleExportMarkdown() {
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
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
            Readings
          </h2>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="text-[10px] text-zinc-400 hover:text-zinc-600"
          >
            Copy as Markdown
          </button>
        </div>
        <ReadingsTable
          readings={data.readings}
          onDelete={async () => {
            await refresh();
          }}
        />
      </section>
    </div>
  );
}
