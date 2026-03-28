"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VocabularyEditor } from "@/components/admin/vocabulary-editor";
import type { VocabularyEntry } from "@/types/bloodwork";

async function loadEntries(): Promise<VocabularyEntry[]> {
  const res = await fetch("/api/data");
  const json = (await res.json()) as {
    vocabulary: { entries: VocabularyEntry[] };
  };
  return json.vocabulary.entries;
}

export default function AdminVocabularyPage() {
  const [entries, setEntries] = useState<VocabularyEntry[] | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadEntries().then(setEntries);
  }, []);

  const refresh = useCallback(async () => {
    setEntries(await loadEntries());
  }, []);

  if (!entries) return <p className="text-xs text-zinc-400">Loading...</p>;

  return (
    <div>
      <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Vocabulary
      </h2>
      <VocabularyEditor entries={entries} onRefresh={refresh} />
    </div>
  );
}
