"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { VocabularyEditor } from "@/components/admin/vocabulary-editor";
import { runApi } from "@/lib/effect/client";
import type { VocabularyEntry } from "@/types/bloodwork";

async function loadEntries(): Promise<VocabularyEntry[]> {
  const json = await runApi((client) => client.vocabulary.list({}));
  return json.entries;
}

export default function AdminVocabularyPage() {
  const [entries, setEntries] = useState<VocabularyEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const didFetch = useRef(false);
  const refreshPending = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    setIsRefreshing(true);
    setLoadError(null);
    try {
      setEntries(await loadEntries());
    } catch (error) {
      setLoadError(
        adminErrorMessage(
          error,
          "Could not load vocabulary. Please try again.",
        ),
      );
    } finally {
      refreshPending.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void refresh();
  }, [refresh]);

  if (!entries && loadError)
    return (
      <AdminErrorState
        message={loadError}
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );

  if (!entries)
    return (
      <p role="status" aria-busy="true" className="text-sm text-zinc-500">
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
      {loadError && (
        <AdminErrorState
          message={loadError}
          onRetry={refresh}
          retrying={isRefreshing}
        />
      )}
      <section className="admin-panel" aria-busy={isRefreshing}>
        <VocabularyEditor entries={entries} onRefresh={refresh} />
      </section>
    </>
  );
}
