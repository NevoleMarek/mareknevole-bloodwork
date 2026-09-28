"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDisplayDate } from "@/lib/date-format";
import { healthValueFormat } from "@/lib/health-metrics";
import { formatDateSpan, formatValueRange } from "@/lib/series-summary";
import type { HealthMetric } from "@/types/health";

export function HealthChart({
  label,
  unit,
  data,
}: {
  label: string;
  unit: string;
  data: HealthMetric[];
}) {
  const latest = data.at(-1);
  const format = healthValueFormat(unit);

  const chartData = useMemo(
    () => data.map((d) => ({ date: Date.parse(d.date), value: d.value })),
    [data],
  );

  return (
    <article className="surface overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="pt-1 text-xs font-semibold tracking-[0.04em] text-zinc-600 uppercase">
          {label}
        </span>
        {latest && (
          <span className="text-right">
            <span className="data-value text-2xl leading-none font-semibold tracking-[-0.04em] text-zinc-950">
              {format(latest.value)}
            </span>
            <span className="text-muted ml-1 text-xs">{unit}</span>
          </span>
        )}
      </div>
      {latest ? (
        <div
          role="img"
          aria-label={`${label}, ${formatDateSpan(data.map((d) => d.date))}: ${formatValueRange(data, format)} ${unit}, latest ${format(latest.value)}.`}
        >
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} accessibilityLayer={false}>
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value: number) =>
                  formatDisplayDate(
                    new Date(value).toISOString().slice(0, 10),
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )
                }
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                tickFormatter={format}
                axisLine={false}
                tickLine={false}
                width="auto"
                domain={["auto", "auto"]}
              />
              <Tooltip
                labelFormatter={(value) =>
                  formatDisplayDate(
                    new Date(Number(value)).toISOString().slice(0, 10),
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                  )
                }
                formatter={(value) => format(Number(value))}
                isAnimationActive={false}
                cursor={{ stroke: "rgba(20, 119, 95, 0.16)" }}
                contentStyle={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 12,
                  border: "1px solid rgba(23, 35, 31, 0.12)",
                  borderRadius: 12,
                  boxShadow: "0 12px 30px rgba(23, 35, 31, 0.12)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={label}
                stroke="var(--accent)"
                strokeWidth={2.25}
                dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "var(--accent)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-muted flex h-[170px] items-center justify-center text-sm">
          No readings in this period.
        </p>
      )}
    </article>
  );
}
