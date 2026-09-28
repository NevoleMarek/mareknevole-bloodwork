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

import { formatDisplayDate } from "@/lib/date-format";
import { healthValueFormat } from "@/lib/health-metrics";
import { formatDateSpan, formatValueRange } from "@/lib/series-summary";
import type { BiomarkerTrendPoint, VocabularyEntry } from "@/types/bloodwork";

export type TrendState =
  | { kind: "loading" }
  | { kind: "ready"; points: BiomarkerTrendPoint[] }
  | { kind: "error" };

function buildChartData(
  points: BiomarkerTrendPoint[],
): { date: string; value: number }[] {
  return points.map((point) => ({
    date: formatDisplayDate(point.date, {
      month: "short",
      year: "2-digit",
    }),
    value: point.value,
  }));
}

function RemoveTrendButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label} trend`}
      className="text-muted ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg hover:bg-zinc-100 hover:text-zinc-900"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

function BiomarkerTrend({
  entry,
  points,
  onRemove,
}: {
  entry: VocabularyEntry;
  points: BiomarkerTrendPoint[];
  onRemove: () => void;
}) {
  const chartData = useMemo(() => buildChartData(points), [points]);
  const latest = points[points.length - 1].value;
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
        <span className="data-value text-muted text-xs">
          {min}–{max} {entry.unit}
        </span>
        <span className="data-value bg-background text-foreground rounded-full px-2.5 py-1 text-xs">
          Latest <strong>{latest}</strong>
        </span>
        <RemoveTrendButton label={entry.label} onRemove={onRemove} />
      </div>
      <div
        className="px-2 pb-3 sm:px-4"
        role="img"
        aria-label={`${entry.label}, ${formatDateSpan(points.map((point) => point.date))}: ${formatValueRange(points)} ${entry.unit}, latest ${latest}; reference range ${min} to ${max}.`}
      >
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} accessibilityLayer={false}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              tickFormatter={healthValueFormat(entry.unit)}
              axisLine={false}
              tickLine={false}
              width="auto"
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
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "var(--accent)", strokeWidth: 2 }}
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
  trends,
  vocabulary,
  onRemove,
  onRetry,
}: {
  selectedKeys: string[];
  trends: Record<string, TrendState>;
  vocabulary: VocabularyEntry[];
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}) {
  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyEntry>();
    for (const v of vocabulary) map.set(v.key, v);
    return map;
  }, [vocabulary]);

  const loadingLabels = selectedKeys.flatMap((key) => {
    const label = vocabMap.get(key)?.label;
    return label && (trends[key]?.kind ?? "loading") === "loading"
      ? [label]
      : [];
  });
  const status = (
    <p role="status" className="sr-only">
      {loadingLabels.length > 0 && `Loading ${loadingLabels.join(", ")} trend…`}
    </p>
  );

  if (selectedKeys.length === 0) return status;

  return (
    <>
      {status}
      <div className="surface overflow-hidden">
        {selectedKeys.map((key, i) => {
          const entry = vocabMap.get(key);
          if (!entry) return null;
          const trend = trends[key];
          return (
            <div
              key={key}
              className={
                i < selectedKeys.length - 1 ? "border-b border-zinc-900/8" : ""
              }
            >
              {!trend || trend.kind === "loading" ? (
                <div className="text-muted px-5 py-8 text-sm">
                  Loading {entry.label} trend…
                </div>
              ) : trend.kind === "error" || trend.points.length === 0 ? (
                <div className="flex items-center gap-2 py-4 pr-4 pl-5 text-sm text-zinc-600 sm:pr-5">
                  <span className="flex-1">
                    {trend.kind === "error"
                      ? `Could not load ${entry.label}.`
                      : `No ${entry.label} results in the last 12 months.`}
                  </span>
                  {trend.kind === "error" && (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => onRetry(key)}
                    >
                      Retry
                    </button>
                  )}
                  <RemoveTrendButton
                    label={entry.label}
                    onRemove={() => onRemove(key)}
                  />
                </div>
              ) : (
                <BiomarkerTrend
                  entry={entry}
                  points={trend.points}
                  onRemove={() => onRemove(key)}
                />
              )}
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
    </>
  );
}
