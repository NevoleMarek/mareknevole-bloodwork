"use client";

import { useMemo, useState } from "react";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric, HealthMetricKey } from "@/types/health";

type Period = "1M" | "6M" | "1Y";

const PERIODS: Period[] = ["1M", "6M", "1Y"];

const PERIOD_MONTHS: Record<Period, number> = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
};

type ChartConfig =
  | { type: "single"; key: HealthMetricKey; label: string; unit: string }
  | { type: "blood_pressure" };

const CHARTS: ChartConfig[] = [
  { type: "single", key: "weight", label: "Weight", unit: "kg" },
  { type: "single", key: "resting_hr", label: "Resting HR", unit: "bpm" },
  { type: "single", key: "hrv", label: "HRV", unit: "ms" },
  { type: "blood_pressure" },
  { type: "single", key: "sleep_duration", label: "Sleep", unit: "hr" },
  { type: "single", key: "vo2_max", label: "VO2 Max", unit: "mL/kg/min" },
];

function filterByPeriod(data: HealthMetric[], period: Period): HealthMetric[] {
  const now = new Date();
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - PERIOD_MONTHS[period],
    now.getDate(),
  );
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export function HealthGrid({ metrics }: { metrics: HealthMetric[] }) {
  const [period, setPeriod] = useState<Period>("6M");

  const filtered = useMemo(
    () => filterByPeriod(metrics, period),
    [metrics, period],
  );

  const byMetric = useMemo(() => {
    const map = new Map<HealthMetricKey, HealthMetric[]>();
    for (const m of filtered) {
      const list = map.get(m.metric) ?? [];
      list.push(m);
      map.set(m.metric, list);
    }
    return map;
  }, [filtered]);

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
        {CHARTS.map((chart) => {
          if (chart.type === "blood_pressure") {
            return (
              <BloodPressureChart
                key="blood_pressure"
                systolic={byMetric.get("blood_pressure_systolic") ?? []}
                diastolic={byMetric.get("blood_pressure_diastolic") ?? []}
              />
            );
          }
          return (
            <HealthChart
              key={chart.key}
              label={chart.label}
              unit={chart.unit}
              data={byMetric.get(chart.key) ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
