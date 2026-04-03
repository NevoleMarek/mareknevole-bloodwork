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
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] tracking-widest text-zinc-400 uppercase">
          {label}
        </span>
        {latest && (
          <span>
            <span className="text-lg font-bold">{latest.value}</span>
            <span className="ml-1 text-xs text-zinc-500">{unit}</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
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
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              border: "1px solid #e4e4e7",
              borderRadius: 0,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke="#18181b"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
