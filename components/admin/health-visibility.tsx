"use client";

import { useCallback, useState } from "react";

import { runApi } from "@/lib/effect/client";

import type { HealthMetricConfig } from "@/types/health";

export function HealthVisibility({
  configs,
}: {
  configs: HealthMetricConfig[];
}) {
  const [items, setItems] = useState(configs);

  const visibleCount = items.filter((c) => c.visible).length;

  const toggle = useCallback(async (metric: string, visible: boolean) => {
    setItems((prev) =>
      prev.map((c) => (c.metric === metric ? { ...c, visible } : c)),
    );
    await runApi((client) =>
      client.health.updateVisibility({ payload: { metric, visible } }),
    );
  }, []);

  return (
    <section className="admin-panel">
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
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <button
            key={c.metric}
            type="button"
            onClick={() => toggle(c.metric, !c.visible)}
            aria-pressed={c.visible}
            className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold ${
              c.visible
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-zinc-900/12 bg-white text-zinc-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
