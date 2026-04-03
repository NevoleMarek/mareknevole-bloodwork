"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

type Period = "6M" | "1Y" | "ALL";

const LINE_STYLES = [
  { stroke: "#18181b", strokeDasharray: undefined },
  { stroke: "#555555", strokeDasharray: "6 3" },
  { stroke: "#888888", strokeDasharray: "2 3" },
  { stroke: "#bbbbbb", strokeDasharray: "10 4" },
] as const;

function filterByPeriod(
  readings: BloodworkReading[],
  period: Period,
): BloodworkReading[] {
  if (period === "ALL") return readings;
  const now = new Date();
  const months = period === "6M" ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return readings.filter((r) => new Date(r.date) >= cutoff);
}

function topMetricKeys(readings: BloodworkReading[], count: number): string[] {
  const counts: Record<string, number> = {};
  for (const r of readings) {
    for (const m of r.measurements) {
      counts[m.vocabularyKey] = (counts[m.vocabularyKey] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}

export function TrendChart({
  readings,
  vocabulary,
}: {
  readings: BloodworkReading[];
  vocabulary: VocabularyEntry[];
}) {
  const [period, setPeriod] = useState<Period>("1Y");
  const defaultKeys = useMemo(() => topMetricKeys(readings, 2), [readings]);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(defaultKeys);

  const filtered = useMemo(
    () => filterByPeriod(readings, period),
    [readings, period],
  );

  const chartData = useMemo(() => {
    return filtered.map((r) => {
      const point: Record<string, string | number> = {
        date: new Date(r.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      };
      for (const m of r.measurements) {
        point[m.vocabularyKey] = m.value;
      }
      return point;
    });
  }, [filtered]);

  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyEntry>();
    for (const v of vocabulary) map.set(v.key, v);
    return map;
  }, [vocabulary]);

  function toggleMetric(key: string) {
    setVisibleKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 4) return [...prev.slice(1), key];
      return [...prev, key];
    });
  }

  const allKeys = useMemo(() => topMetricKeys(readings, 10), [readings]);

  return (
    <div className="border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
          {allKeys.map((key) => {
            const entry = vocabMap.get(key);
            if (!entry) return null;
            const idx = visibleKeys.indexOf(key);
            const active = idx !== -1;
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMetric(key)}
                className={active ? "text-zinc-900" : "text-zinc-400"}
              >
                <span aria-hidden>
                  {active && idx < LINE_STYLES.length
                    ? LINE_STYLES[idx].strokeDasharray
                      ? "- -"
                      : "—"
                    : "○"}
                </span>{" "}
                <span>{entry.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 self-start border border-zinc-200 text-[9px]">
          {(["6M", "1Y", "ALL"] as const).map((p) => (
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
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              border: "1px solid #e4e4e7",
              borderRadius: 0,
            }}
          />
          {visibleKeys.map((key, i) => {
            const style = LINE_STYLES[i] ?? LINE_STYLES[0];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={vocabMap.get(key)?.label ?? key}
                stroke={style.stroke}
                strokeDasharray={style.strokeDasharray}
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: style.stroke }}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
