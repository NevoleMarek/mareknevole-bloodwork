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

export function BloodPressureChart({
  systolic,
  diastolic,
}: {
  systolic: HealthMetric[];
  diastolic: HealthMetric[];
}) {
  const latestSys = systolic.at(-1);
  const latestDia = diastolic.at(-1);

  const chartData = useMemo(() => {
    const sysReg = linearRegression(
      systolic.map((d, i) => ({ x: i, y: d.value })),
    );
    const diaReg = linearRegression(
      diastolic.map((d, i) => ({ x: i, y: d.value })),
    );
    const diaMap = new Map(diastolic.map((d) => [d.date, d.value]));

    return systolic.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      systolic: d.value,
      diastolic: diaMap.get(d.date) ?? null,
      sysTrend: sysReg.slope * i + sysReg.intercept,
      diaTrend: diaReg.slope * i + diaReg.intercept,
    }));
  }, [systolic, diastolic]);

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] tracking-widest text-zinc-400 uppercase">
          Blood Pressure
        </span>
        {latestSys && latestDia && (
          <span>
            <span className="text-lg font-bold">
              {latestSys.value}/{latestDia.value}
            </span>
            <span className="ml-1 text-xs text-zinc-500">mmHg</span>
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
            domain={["dataMin - 5", "dataMax + 5"]}
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
            dataKey="systolic"
            name="Systolic"
            stroke="#18181b"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#18181b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="sysTrend"
            name="Sys Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="diaTrend"
            name="Dia Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
