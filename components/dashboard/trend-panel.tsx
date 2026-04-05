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
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-[11px]">
        <span className="min-w-[100px] text-[10px] font-bold tracking-[1px] uppercase">
          {entry.label}
        </span>
        <span className="text-zinc-500">
          {min}–{max} {entry.unit}
        </span>
        {latest !== null && (
          <span>
            Latest: <strong>{latest}</strong>
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto px-1.5 text-sm text-zinc-400 hover:text-zinc-900"
        >
          ×
        </button>
      </div>
      <div className="px-4 pb-2">
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 8, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 8, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <ReferenceArea y1={min} y2={max} fill="#d4d4d8" fillOpacity={0.2} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#18181b"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: "#18181b" }}
              activeDot={{ r: 4 }}
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
    <div className="border border-zinc-200 bg-white">
      {selectedKeys.map((key, i) => {
        const entry = vocabMap.get(key);
        if (!entry) return null;
        return (
          <div
            key={key}
            className={
              i < selectedKeys.length - 1 ? "border-b border-zinc-200" : ""
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
      <div className="border-t border-zinc-200 px-4 py-3">
        {selectedKeys.map((key) => {
          const entry = vocabMap.get(key);
          if (!entry || !entry.description) return null;
          return (
            <div key={key} className="mb-2 last:mb-0">
              <div className="text-[10px] font-bold tracking-[1px] uppercase">
                {entry.label}
              </div>
              <div className="text-[11px] leading-relaxed text-zinc-500">
                {entry.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
