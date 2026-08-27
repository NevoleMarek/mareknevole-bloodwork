"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { ReadingsTable } from "@/components/admin/readings-table";
import { makeReadingId, type ExportData } from "@/lib/effect/api";
import { runApi } from "@/lib/effect/client";
import type { ReadingCursor, ReadingSummary } from "@/types/bloodwork";

type MoreState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

type DataState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      readings: ReadingSummary[];
      nextCursor: ReadingCursor | null;
      more: MoreState;
    };

type DeleteState =
  | { kind: "idle" }
  | { kind: "pending"; id: string }
  | { kind: "error"; id: string; message: string };

const loadReadings = (cursor: ReadingCursor | null) =>
  runApi((client) =>
    client.readings.list({ query: cursor === null ? {} : cursor }),
  );

function formatExportMarkdown(data: ExportData) {
  const lines: string[] = [];
  for (const reading of data.readings) {
    lines.push(`## ${reading.date} (${reading.source})\n`);
    lines.push("| Marker | Value | Unit | Status |");
    lines.push("|---|---|---|---|");
    for (const measurement of reading.measurements) {
      const entry = data.vocabulary.entries.find(
        (candidate) => candidate.key === measurement.vocabularyKey,
      );
      lines.push(
        `| ${entry?.label ?? measurement.vocabularyKey} | ${measurement.value} | ${measurement.unit} | ${measurement.status} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export default function AdminDataPage() {
  const [data, setData] = useState<DataState>({ kind: "loading" });
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">(
    "idle",
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({
    kind: "idle",
  });
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportData = useRef<ExportData | null>(null);
  const exportRequest = useRef<Promise<ExportData> | null>(null);
  const exportGeneration = useRef(0);
  const readingsGeneration = useRef(0);
  const readingsRequest = useRef(false);
  const exportPending = useRef(false);
  const deletePending = useRef(false);

  const loadFirstPage = useCallback(async () => {
    if (readingsRequest.current) return;
    readingsRequest.current = true;
    const generation = ++readingsGeneration.current;
    setData({ kind: "loading" });
    try {
      const page = await loadReadings(null);
      if (readingsGeneration.current !== generation) return;
      setData({
        kind: "ready",
        readings: page.entries,
        nextCursor: page.nextCursor,
        more: { kind: "idle" },
      });
    } catch (error) {
      if (readingsGeneration.current !== generation) return;
      setData({
        kind: "error",
        message: adminErrorMessage(
          error,
          "Could not load readings. Please try again.",
        ),
      });
    } finally {
      readingsRequest.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadFirstPage();
    });
    return () => {
      active = false;
    };
  }, [loadFirstPage]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function loadMore() {
    if (data.kind !== "ready" || !data.nextCursor) return;
    const generation = readingsGeneration.current;
    setData({ ...data, more: { kind: "loading" } });
    try {
      const page = await loadReadings(data.nextCursor);
      if (readingsGeneration.current !== generation) return;
      setData((current) => {
        if (current.kind !== "ready") return current;
        return {
          kind: "ready",
          readings: [...current.readings, ...page.entries],
          nextCursor: page.nextCursor,
          more: { kind: "idle" },
        };
      });
    } catch (error) {
      if (readingsGeneration.current !== generation) return;
      setData((current) =>
        current.kind === "ready"
          ? {
              ...current,
              more: {
                kind: "error",
                message: adminErrorMessage(
                  error,
                  "Could not load more readings. Please try again.",
                ),
              },
            }
          : current,
      );
    }
  }

  function loadExportData() {
    if (exportData.current) return Promise.resolve(exportData.current);
    if (exportRequest.current) return exportRequest.current;

    const generation = exportGeneration.current;
    const request = (async () => {
      try {
        const result = await runApi((client) => client.readings.export({}));
        if (exportGeneration.current === generation) {
          exportData.current = result;
        }
        return result;
      } catch (error) {
        if (exportGeneration.current === generation) {
          exportRequest.current = null;
        }
        throw error;
      }
    })();
    exportRequest.current = request;
    return request;
  }

  async function handleExportMarkdown() {
    if (exportPending.current) return;
    exportPending.current = true;
    setCopyState("copying");
    setExportError(null);
    try {
      const markdown = loadExportData().then(formatExportMarkdown);
      if ("ClipboardItem" in globalThis && "write" in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": markdown.then(
              (text) => new Blob([text], { type: "text/plain" }),
            ),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(await markdown);
      }
      setCopyState("copied");
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopyState("idle"), 1400);
    } catch (error) {
      setCopyState("idle");
      setExportError(
        adminErrorMessage(
          error,
          "Could not export readings. Please try again.",
        ),
      );
    } finally {
      exportPending.current = false;
    }
  }

  async function handleDelete(id: string) {
    if (deletePending.current) return;
    deletePending.current = true;
    setDeleteState({ kind: "pending", id });
    try {
      await runApi((client) =>
        client.readings.delete({ params: { id: makeReadingId(id) } }),
      );
      exportGeneration.current += 1;
      exportData.current = null;
      exportRequest.current = null;
      await loadFirstPage();
      setDeleteState({ kind: "idle" });
    } catch (error) {
      setDeleteState({
        kind: "error",
        id,
        message: adminErrorMessage(
          error,
          "Could not delete this reading. Please try again.",
        ),
      });
    } finally {
      deletePending.current = false;
    }
  }

  function retryDelete() {
    if (deleteState.kind !== "error") return;
    void handleDelete(deleteState.id);
  }

  if (data.kind === "loading") {
    return (
      <p role="status" aria-busy="true" className="text-sm text-zinc-500">
        Loading readings…
      </p>
    );
  }

  if (data.kind === "error") {
    return <AdminErrorState message={data.message} onRetry={loadFirstPage} />;
  }

  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Source records</p>
        <h1 className="mt-2">Readings</h1>
        <p>Review imported panels or export the dataset as structured text.</p>
      </div>
      {exportError && (
        <AdminErrorState
          message={exportError}
          onRetry={handleExportMarkdown}
          retrying={copyState === "copying"}
        />
      )}
      {deleteState.kind === "error" && (
        <AdminErrorState message={deleteState.message} onRetry={retryDelete} />
      )}
      <section
        className="admin-panel"
        aria-busy={
          data.more.kind === "loading" || deleteState.kind === "pending"
        }
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-800">
            {data.readings.length}
            {data.nextCursor ? "+" : ""} lab panels loaded
          </p>
          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={copyState === "copying"}
            aria-label="Copy as Markdown"
            data-copied={copyState === "copied"}
            className="button-secondary copy-markdown-button"
          >
            <span aria-hidden="true" className="copy-label-stack">
              <span className="copy-label copy-label-default">
                {copyState === "copying" ? "Preparing" : "Copy as Markdown"}
              </span>
              <span className="copy-label copy-label-confirmed">Copied</span>
            </span>
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {copyState === "copied" ? "Markdown copied to clipboard." : ""}
          </span>
        </div>
        <ReadingsTable
          readings={data.readings}
          deletingId={deleteState.kind === "pending" ? deleteState.id : null}
          onDelete={handleDelete}
        />
        {data.more.kind === "error" && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {data.more.message}
          </p>
        )}
        {data.nextCursor && (
          <button
            type="button"
            onClick={loadMore}
            disabled={data.more.kind === "loading"}
            className="button-secondary mt-4"
          >
            {data.more.kind === "loading"
              ? "Loading…"
              : data.more.kind === "error"
                ? "Retry"
                : "Load more"}
          </button>
        )}
      </section>
    </>
  );
}
