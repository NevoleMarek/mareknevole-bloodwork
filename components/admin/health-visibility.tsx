"use client";

import { useCallback, useOptimistic } from "react";

import type { HealthMetricConfig } from "@/types/health";

export function HealthVisibility({
  configs,
}: {
  configs: HealthMetricConfig[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    configs,
    (state, update: { metric: string; visible: boolean }) =>
      state.map((c) =>
        c.metric === update.metric ? { ...c, visible: update.visible } : c,
      ),
  );

  const visibleCount = optimistic.filter((c) => c.visible).length;

  const toggle = useCallback(
    async (metric: string, visible: boolean) => {
      setOptimistic({ metric, visible });
      await fetch("/api/health-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, visible }),
      });
    },
    [setOptimistic],
  );

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Dashboard visibility
        </span>
        <span className="text-[10px] text-zinc-400">
          {visibleCount} of {optimistic.length} shown
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {optimistic.map((c) => (
          <button
            key={c.metric}
            type="button"
            onClick={() => toggle(c.metric, !c.visible)}
            className={`px-2.5 py-1 text-[10px] transition-colors ${
              c.visible
                ? "border border-zinc-800 bg-zinc-800 text-white"
                : "border border-zinc-200 text-zinc-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
