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

import { linearRegression } from "@/lib/linear-regression";
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

  const chartData = useMemo(() => {
    const reg = linearRegression(data.map((d, i) => ({ x: i, y: d.value })));
    return data.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: d.value,
      trend: reg.slope * i + reg.intercept,
    }));
  }, [data]);

  return (
    <article className="surface overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="pt-1 text-xs font-semibold tracking-[0.04em] text-zinc-600 uppercase">
          {label}
        </span>
        {latest && (
          <span className="text-right">
            <span className="data-value text-2xl leading-none font-semibold tracking-[-0.04em] text-zinc-950">
              {latest.value}
            </span>
            <span className="ml-1 text-xs text-zinc-500">{unit}</span>
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={`${label} history. Latest value ${latest?.value ?? "unavailable"} ${unit}.`}
      >
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#77827e" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#77827e" }}
              axisLine={false}
              tickLine={false}
              width={36}
              domain={["dataMin - 1", "dataMax + 1"]}
            />
            <Tooltip
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
              stroke="#14775f"
              strokeWidth={2.25}
              dot={{ r: 2.5, fill: "#14775f", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#14775f", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="trend"
              name="Trend"
              stroke="#9ba5a1"
              strokeWidth={1.25}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
