"use client";

import Link from "next/link";
import { useMemo } from "react";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import type { Period } from "@/lib/period";
import { PERIODS } from "@/lib/period";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

export function HealthGrid({
  metrics,
  configs,
  period,
}: {
  metrics: HealthMetric[];
  configs: HealthMetricConfig[];
  period: Period;
}) {
  const byMetric = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of metrics) {
      const list = map.get(m.metric) ?? [];
      list.push(m);
      map.set(m.metric, list);
    }
    return map;
  }, [metrics]);

  const hasBP =
    configs.some((c) => c.metric === "blood_pressure_systolic") &&
    configs.some((c) => c.metric === "blood_pressure_diastolic");

  const singleConfigs = configs.filter(
    (c) =>
      c.metric !== "blood_pressure_systolic" &&
      c.metric !== "blood_pressure_diastolic",
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <nav
          aria-label="Health history period"
          className="flex shrink-0 gap-0.5 rounded-full border border-zinc-900/10 bg-white/75 p-1 text-xs shadow-sm"
        >
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={p === "6M" ? "/" : `/?period=${p}`}
              scroll={false}
              aria-current={period === p ? "page" : undefined}
              className={`flex min-h-9 min-w-11 items-center justify-center rounded-full px-3 font-semibold ${
                period === p
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hasBP && (
          <BloodPressureChart
            systolic={byMetric.get("blood_pressure_systolic") ?? []}
            diastolic={byMetric.get("blood_pressure_diastolic") ?? []}
          />
        )}
        {singleConfigs.map((config) => (
          <HealthChart
            key={config.metric}
            label={config.label}
            unit={config.unit}
            data={byMetric.get(config.metric) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
