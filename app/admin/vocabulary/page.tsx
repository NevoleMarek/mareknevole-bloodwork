"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VocabularyEditor } from "@/components/admin/vocabulary-editor";
import { decodeResponseJson } from "@/lib/effect/client";
import { VocabularyResponse } from "@/lib/schemas/wire";
import type { VocabularyEntry } from "@/types/bloodwork";

async function loadEntries(): Promise<VocabularyEntry[]> {
  const res = await fetch("/api/vocabulary");
  if (!res.ok) throw new Error("Vocabulary request failed");
  const json = await decodeResponseJson(
    res,
    VocabularyResponse,
    "admin.vocabulary",
  );
  return json.entries;
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

  if (!entries)
    return (
      <p role="status" className="text-sm text-zinc-500">
        Loading vocabulary…
      </p>
    );

  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Data dictionary</p>
        <h1 className="mt-2">Vocabulary</h1>
        <p>Manage marker names, units, ranges, and dashboard visibility.</p>
      </div>
      <section className="admin-panel">
        <VocabularyEditor entries={entries} onRefresh={refresh} />
      </section>
    </>
  );
}
