"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ImportState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type StateLayer = {
  id: number;
  state: ImportState;
  phase: "entering" | "stable" | "leaving";
};

export function HealthImport({ onImported }: { onImported: () => void }) {
  const [layers, setLayers] = useState<StateLayer[]>([
    { id: 0, state: { kind: "idle" }, phase: "stable" },
  ]);
  const [activeLayerId, setActiveLayerId] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const nextLayerId = useRef(1);
  const dragDepth = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionTo = useCallback((state: ImportState) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);

    const id = nextLayerId.current;
    nextLayerId.current += 1;
    dragDepth.current = 0;
    setIsDragging(false);
    setActiveLayerId(id);
    setLayers((current) => [
      ...current.map((layer): StateLayer => ({ ...layer, phase: "leaving" })),
      { id, state, phase: "entering" },
    ]);

    settleTimer.current = setTimeout(() => {
      setLayers((current) =>
        current.map((layer) =>
          layer.id === id ? { ...layer, phase: "stable" } : layer,
        ),
      );
    });
    removeTimer.current = setTimeout(() => {
      setLayers((current) => current.filter((layer) => layer.id === id));
    }, 180);
  }, []);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (removeTimer.current) clearTimeout(removeTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      transitionTo({ kind: "uploading" });

      try {
        const body = await file.text();
        const res = await fetch("/api/health-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = (await res.json()) as {
          error?: string;
          metrics?: number;
          days?: number;
        };
        if (!res.ok) {
          transitionTo({
            kind: "error",
            message: `Error: ${data.error ?? "Import failed"}`,
          });
          return;
        }

        transitionTo({
          kind: "success",
          message: `Imported ${data.metrics} metrics, ${data.days} days`,
        });
        onImported();
        resetTimer.current = setTimeout(
          () => transitionTo({ kind: "idle" }),
          3000,
        );
      } catch (error) {
        transitionTo({
          kind: "error",
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    },
    [onImported, transitionTo],
  );

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
    <section className="admin-panel">
      <h2 className="text-sm font-semibold text-zinc-800">
        Import health data
      </h2>
      <p className="mt-1 mb-5 text-sm text-zinc-500">
        Add a Health Auto Export JSON file to refresh the dashboard.
      </p>
      <div className="health-import-state-region">
        {layers.map((layer) => (
          <div
            key={layer.id}
            data-state={layer.state.kind}
            data-phase={layer.phase}
            aria-hidden={layer.id === activeLayerId ? undefined : true}
            className="health-import-state"
          >
            {(layer.state.kind === "idle" || layer.state.kind === "error") && (
              <label
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="block h-full cursor-pointer"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleChange}
                  disabled={layer.id !== activeLayerId}
                  className="peer sr-only"
                />
                <span
                  data-drag-active={layer.id === activeLayerId && isDragging}
                  className="file-drop-shell flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/20 bg-zinc-50/70 px-4 text-center peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-700/20"
                >
                  <span
                    aria-hidden="true"
                    className="file-drop-glyph mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-800"
                  >
                    +
                  </span>
                  {layer.state.kind === "error" ? (
                    <>
                      <span
                        role="alert"
                        className="text-sm font-semibold text-red-700"
                      >
                        {layer.state.message}
                      </span>
                      <span className="mt-1 text-xs text-zinc-500">
                        Drop another file or choose one to retry.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-zinc-800">
                        Drop health-data.json here
                      </span>
                      <span className="mt-1 text-xs text-zinc-500">
                        or choose a file
                      </span>
                    </>
                  )}
                </span>
              </label>
            )}
            {layer.state.kind === "uploading" && (
              <div
                role="status"
                className="flex h-full items-center justify-center rounded-2xl bg-zinc-50 px-4"
              >
                <span className="text-sm text-zinc-600">Uploading…</span>
              </div>
            )}
            {layer.state.kind === "success" && (
              <div
                role="status"
                className="flex h-full items-center justify-center rounded-2xl bg-emerald-50 px-4"
              >
                <span className="text-sm font-medium text-emerald-900">
                  {layer.state.message}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
