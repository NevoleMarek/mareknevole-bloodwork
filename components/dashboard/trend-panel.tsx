"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

function buildChartData(
  key: string,
  readings: BloodworkReading[],
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  for (const r of readings) {
    const m = r.measurements.find((m) => m.vocabularyKey === key);
    if (m) {
      points.push({
        date: new Date(r.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value: m.value,
      });
    }
  }
  return points;
}

function latestValue(key: string, readings: BloodworkReading[]): number | null {
  for (let i = readings.length - 1; i >= 0; i--) {
    const m = readings[i].measurements.find((m) => m.vocabularyKey === key);
    if (m) return m.value;
  }
  return null;
}

function BiomarkerTrend({
  entry,
  readings,
  onRemove,
}: {
  entry: VocabularyEntry;
  readings: BloodworkReading[];
  onRemove: () => void;
}) {
  const chartData = useMemo(
    () => buildChartData(entry.key, readings),
    [entry.key, readings],
  );
  const latest = latestValue(entry.key, readings);
  const { min, max } = entry.referenceRange;

  const allValues = chartData.map((d) => d.value);
  const dataMin = Math.min(...allValues, min);
  const dataMax = Math.max(...allValues, max);
  const padding = (dataMax - dataMin) * 0.15 || 1;
  const yMin = dataMin - padding;
  const yMax = dataMax + padding;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-4 pb-2 sm:px-5">
        <span className="min-w-[100px] text-sm font-semibold tracking-[-0.01em] text-zinc-900">
          {entry.label}
        </span>
        <span className="data-value text-xs text-zinc-500">
          {min}–{max} {entry.unit}
        </span>
        {latest !== null && (
          <span className="data-value rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900">
            Latest <strong>{latest}</strong>
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${entry.label} trend`}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div
        className="px-2 pb-3 sm:px-4"
        role="img"
        aria-label={`${entry.label} history. Latest value ${latest ?? "unavailable"} ${entry.unit}; reference range ${min} to ${max}.`}
      >
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "#77827e" }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 9, fill: "#77827e" }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <ReferenceArea
              y1={min}
              y2={max}
              fill="#70bd9f"
              fillOpacity={0.13}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#14775f"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#14775f", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#14775f", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendPanel({
  selectedKeys,
  readings,
  vocabulary,
  onRemove,
}: {
  selectedKeys: string[];
  readings: BloodworkReading[];
  vocabulary: VocabularyEntry[];
  onRemove: (key: string) => void;
}) {
  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyEntry>();
    for (const v of vocabulary) map.set(v.key, v);
    return map;
  }, [vocabulary]);

  if (selectedKeys.length === 0) return null;

  return (
    <div className="surface overflow-hidden">
      {selectedKeys.map((key, i) => {
        const entry = vocabMap.get(key);
        if (!entry) return null;
        return (
          <div
            key={key}
            className={
              i < selectedKeys.length - 1 ? "border-b border-zinc-900/8" : ""
            }
          >
            <BiomarkerTrend
              entry={entry}
              readings={readings}
              onRemove={() => onRemove(key)}
            />
          </div>
        );
      })}
      <div className="border-t border-zinc-900/8 bg-zinc-50/70 px-4 py-4 sm:px-5">
        {selectedKeys.map((key) => {
          const entry = vocabMap.get(key);
          if (!entry || !entry.description) return null;
          return (
            <div key={key} className="mb-3 last:mb-0">
              <div className="text-xs font-semibold text-zinc-800">
                {entry.label}
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-600">
                {entry.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
