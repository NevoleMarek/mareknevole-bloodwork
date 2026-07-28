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
    <article className="surface overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="pt-1 text-xs font-semibold tracking-[0.04em] text-zinc-600 uppercase">
          Blood Pressure
        </span>
        {latestSys && latestDia && (
          <span className="text-right">
            <span className="data-value text-2xl leading-none font-semibold tracking-[-0.04em] text-zinc-950">
              {latestSys.value}/{latestDia.value}
            </span>
            <span className="ml-1 text-xs text-zinc-500">mmHg</span>
          </span>
        )}
      </div>
      <div
        role="img"
        aria-label={`Blood pressure history. Latest value ${
          latestSys && latestDia
            ? `${latestSys.value} over ${latestDia.value} millimeters of mercury`
            : "unavailable"
        }.`}
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
              domain={["dataMin - 5", "dataMax + 5"]}
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
              dataKey="systolic"
              name="Systolic"
              stroke="#14775f"
              strokeWidth={2.25}
              dot={{ r: 2.5, fill: "#14775f", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#14775f", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              name="Diastolic"
              stroke="#4e759d"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 2.5, fill: "#4e759d", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#4e759d", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="sysTrend"
              name="Sys Trend"
              stroke="#a5afab"
              strokeWidth={1}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diaTrend"
              name="Dia Trend"
              stroke="#bdc6c2"
              strokeWidth={1}
              strokeDasharray="2 3"
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
