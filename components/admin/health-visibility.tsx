"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiErrorMessage, runApi } from "@/lib/effect/client";

import type { HealthMetricConfig } from "@/types/health";

type RefreshConfigs = () =>
  | Promise<HealthMetricConfig[] | void>
  | HealthMetricConfig[]
  | void;

type ConfigRevision = {
  configs: HealthMetricConfig[];
  key: string;
};

type VisibilityState =
  | { kind: "idle" }
  | { kind: "pending"; metric: string; visible: boolean }
  | {
      kind: "error";
      metric: string;
      visible: boolean;
      message: string;
      revision: ConfigRevision;
    };

function visibilityErrorMessage(error: Error): string {
  const transportMessage = apiErrorMessage(error);
  const detail =
    transportMessage ?? (error instanceof Error ? error.message : undefined);

  return detail
    ? `Could not update dashboard visibility: ${detail}`
    : "Could not update dashboard visibility. Please retry.";
}

export function HealthVisibility({
  configs,
  onRefresh,
}: {
  configs: HealthMetricConfig[];
  onRefresh?: RefreshConfigs;
}) {
  // A new prop snapshot invalidates any provisional post-save state. Using a
  // revision token also prevents an old local snapshot from becoming visible
  // again if a parent later reuses the same array reference.
  const configRevisionKey = JSON.stringify(configs);
  const configRevision = useMemo<ConfigRevision>(
    () => ({ configs, key: configRevisionKey }),
    [configs, configRevisionKey],
  );
  const [localItems, setLocalItems] = useState<{
    revision: ConfigRevision;
    items: HealthMetricConfig[];
  } | null>(null);
  const [state, setState] = useState<VisibilityState>({ kind: "idle" });
  const mounted = useRef(true);
  const pending = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The parent owns the authoritative configuration. A local result is only
  // used until the next imported or otherwise refetched response arrives.
  const items =
    localItems?.revision === configRevision ? localItems.items : configs;
  const displayState: VisibilityState =
    state.kind === "error" && state.revision !== configRevision
      ? { kind: "idle" }
      : state;

  const visibleCount = items.filter((c) => c.visible).length;

  const toggle = useCallback(
    async (metric: string, visible: boolean) => {
      // Keep all controls disabled for the whole mutation/refetch cycle. The
      // ref guard also covers two synchronous clicks before React rerenders.
      if (pending.current) return;

      pending.current = true;
      const id = requestId.current + 1;
      requestId.current = id;
      setState({ kind: "pending", metric, visible });

      try {
        await runApi((client) =>
          client.health.updateVisibility({
            params: { metric },
            payload: { visible },
          }),
        );

        const refreshed = await onRefresh?.();
        if (!mounted.current || requestId.current !== id) return;

        if (Array.isArray(refreshed)) {
          setLocalItems({ revision: configRevision, items: refreshed });
        } else {
          // Keep the component useful while a parent refresh that does not
          // return its data propagates. A later authoritative prop snapshot
          // supersedes this provisional result.
          setLocalItems({
            revision: configRevision,
            items: items.map((config) =>
              config.metric === metric ? { ...config, visible } : config,
            ),
          });
        }
        setState({ kind: "idle" });
      } catch (error) {
        if (!mounted.current || requestId.current !== id) return;
        // No optimistic state was applied, so a failed mutation leaves the
        // last known authoritative values visible and safe to retry.
        setState({
          kind: "error",
          metric,
          visible,
          message:
            error instanceof Error
              ? visibilityErrorMessage(error)
              : "Could not update dashboard visibility. Please retry.",
          revision: configRevision,
        });
      } finally {
        if (requestId.current === id) pending.current = false;
      }
    },
    [configRevision, items, onRefresh],
  );

  return (
    <section
      className="admin-panel"
      aria-busy={displayState.kind === "pending"}
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">
            Dashboard visibility
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Choose the daily signals shown publicly.
          </p>
        </div>
        <span className="data-value text-xs whitespace-nowrap text-zinc-500">
          {visibleCount} of {items.length} shown
        </span>
      </div>
      {displayState.kind === "pending" && (
        <p role="status" className="mb-3 text-sm text-zinc-500">
          Saving visibility…
        </p>
      )}
      {displayState.kind === "error" && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-red-700"
        >
          <span>{displayState.message}</span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => toggle(displayState.metric, displayState.visible)}
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <button
            key={c.metric}
            type="button"
            onClick={() => toggle(c.metric, !c.visible)}
            aria-pressed={c.visible}
            disabled={displayState.kind === "pending"}
            className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold ${
              c.visible
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-zinc-900/12 bg-white text-zinc-600"
            } disabled:cursor-wait disabled:opacity-60`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
