"use client";

import { useRef, useState } from "react";
import type { BiomarkerMetric } from "@/components/dashboard/biomarker-table";
import { BiomarkerTable } from "@/components/dashboard/biomarker-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { TrendState } from "@/components/dashboard/trend-panel";
import { TrendPanel } from "@/components/dashboard/trend-panel";
import { runApi } from "@/lib/effect/client";
import { makeBiomarkerKey } from "@/lib/effect/api";
import type { VocabularyEntry } from "@/types/bloodwork";

const MAX_SELECTED = 10;

export function MetricsSection({
  featured,
  nonFeatured,
  vocabulary,
}: {
  featured: BiomarkerMetric[];
  nonFeatured: BiomarkerMetric[];
  vocabulary: VocabularyEntry[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [trends, setTrends] = useState<Record<string, TrendState>>({});
  const pending = useRef(new Set<string>());

  function loadTrend(key: string) {
    if (trends[key]?.kind === "ready" || pending.current.has(key)) return;
    pending.current.add(key);
    setTrends((current) => ({
      ...current,
      [key]: { kind: "loading" },
    }));
    runApi((client) =>
      client.dashboard.trend({ params: { key: makeBiomarkerKey(key) } }),
    )
      .then((data) => {
        if (data.points.length === 0) throw new Error("Trend is empty");
        setTrends((current) => ({
          ...current,
          [key]: { kind: "ready", points: data.points },
        }));
      })
      .catch(() =>
        setTrends((current) => ({
          ...current,
          [key]: { kind: "error" },
        })),
      )
      .finally(() => pending.current.delete(key));
  }

  function toggle(key: string) {
    if (selected.includes(key)) {
      setSelected(selected.filter((candidate) => candidate !== key));
      return;
    }
    if (selected.length >= MAX_SELECTED) return;
    loadTrend(key);
    setSelected([...selected, key]);
  }

  function preloadTrend(key: string, pointerType: string) {
    if (pointerType === "touch") return;
    if (selected.includes(key) || selected.length >= MAX_SELECTED) return;
    loadTrend(key);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2 md:grid-cols-4 md:gap-4">
        {featured.map((m) => (
          <button
            key={m.vocabularyKey}
            onPointerDown={(event) =>
              preloadTrend(m.vocabularyKey, event.pointerType)
            }
            onClick={() => toggle(m.vocabularyKey)}
            type="button"
            aria-pressed={selected.includes(m.vocabularyKey)}
            aria-label={`${m.label}: ${m.value} ${m.unit}. ${selected.includes(m.vocabularyKey) ? "Remove from trends" : "Add to trends"}`}
            className={`min-w-0 rounded-3xl text-left ${
              selected.includes(m.vocabularyKey)
                ? "[&>div]:border-emerald-600 [&>div]:shadow-[0_0_0_3px_rgba(20,119,95,0.1)]"
                : ""
            }`}
          >
            <MetricCard
              label={m.label}
              value={m.value}
              unit={m.unit}
              min={m.min}
              max={m.max}
              status={m.status}
            />
          </button>
        ))}
      </div>

      <div className="mt-5">
        <TrendPanel
          selectedKeys={selected}
          trends={trends}
          vocabulary={vocabulary}
          onRetry={loadTrend}
          onRemove={(key) =>
            setSelected((prev) => prev.filter((k) => k !== key))
          }
        />
      </div>

      {nonFeatured.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold tracking-[-0.01em] text-zinc-800">
              All biomarkers
            </h3>
            <p className="text-xs text-zinc-500">
              Select up to {MAX_SELECTED} to compare
            </p>
          </div>
          <BiomarkerTable
            metrics={nonFeatured}
            selected={selected}
            onToggle={toggle}
            onIntent={preloadTrend}
          />
        </div>
      )}
    </>
  );
}
