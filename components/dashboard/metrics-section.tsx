"use client";

import { useState } from "react";

import type { BiomarkerMetric } from "@/components/dashboard/biomarker-table";
import { BiomarkerTable } from "@/components/dashboard/biomarker-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendPanel } from "@/components/dashboard/trend-panel";
import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const MAX_SELECTED = 10;

export function MetricsSection({
  featured,
  nonFeatured,
  readings,
  vocabulary,
}: {
  featured: BiomarkerMetric[];
  nonFeatured: BiomarkerMetric[];
  readings: BloodworkReading[];
  vocabulary: VocabularyEntry[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, key];
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 min-[370px]:grid-cols-2 md:grid-cols-4 md:gap-4">
        {featured.map((m) => (
          <button
            key={m.vocabularyKey}
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
          readings={readings}
          vocabulary={vocabulary}
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
          />
        </div>
      )}
    </>
  );
}
