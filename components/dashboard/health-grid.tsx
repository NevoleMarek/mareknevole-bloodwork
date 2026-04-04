"use client";

import { useMemo, useState } from "react";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

type Period = "1M" | "6M" | "1Y" | "ALL";

const PERIODS: Period[] = ["1M", "6M", "1Y", "ALL"];

const PERIOD_MONTHS: Record<Period, number | null> = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
  ALL: null,
};

function filterByPeriod(data: HealthMetric[], period: Period): HealthMetric[] {
  const months = PERIOD_MONTHS[period];
  if (months === null) return data;
  const now = new Date();
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - months,
    now.getDate(),
  );
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export function HealthGrid({
  metrics,
  configs,
}: {
  metrics: HealthMetric[];
  configs: HealthMetricConfig[];
}) {
  const [period, setPeriod] = useState<Period>("6M");

  const filtered = useMemo(
    () => filterByPeriod(metrics, period),
    [metrics, period],
  );

  const byMetric = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of filtered) {
      const list = map.get(m.metric) ?? [];
      list.push(m);
      map.set(m.metric, list);
    }
    return map;
  }, [filtered]);

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
        <div className="flex shrink-0 border border-zinc-200 text-[9px]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 ${
                period === p ? "bg-zinc-900 text-white" : "text-zinc-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
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
