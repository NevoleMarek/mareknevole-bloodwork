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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {featured.map((m) => (
          <div
            key={m.vocabularyKey}
            onClick={() => toggle(m.vocabularyKey)}
            className={`cursor-pointer ${
              selected.includes(m.vocabularyKey)
                ? "[&>div]:border-zinc-900"
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
          </div>
        ))}
      </div>

      <div className="mt-4">
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
        <div className="mt-4">
          <h3 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
            All Biomarkers
          </h3>
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
