"use client";

import { useMemo } from "react";
import {
  Legend,
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

const format = healthValueFormat("mmHg");

export function BloodPressureChart({
  systolic,
  diastolic,
}: {
  systolic: HealthMetric[];
  diastolic: HealthMetric[];
}) {
  const latestSys = systolic.at(-1);
  const latestDia = diastolic.at(-1);
  const latestPair =
    latestSys && latestDia && latestSys.date === latestDia.date
      ? `${format(latestSys.value)}/${format(latestDia.value)}`
      : null;

  const chartData = useMemo(() => {
    const sysMap = new Map(systolic.map((d) => [d.date, d.value]));
    const diaMap = new Map(diastolic.map((d) => [d.date, d.value]));
    const dates = new Set([...sysMap.keys(), ...diaMap.keys()]);

    return [...dates].sort().map((date) => ({
      date: Date.parse(date),
      systolic: sysMap.get(date) ?? null,
      diastolic: diaMap.get(date) ?? null,
    }));
  }, [systolic, diastolic]);

  const summary = [
    systolic.length > 0 &&
      `systolic ${formatValueRange(systolic, format)} mmHg`,
    diastolic.length > 0 &&
      `diastolic ${formatValueRange(diastolic, format)} mmHg`,
    latestPair && `latest ${latestPair} mmHg`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="surface overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="pt-1 text-xs font-semibold tracking-[0.04em] text-zinc-600 uppercase">
          Blood Pressure
        </span>
        {latestPair && (
          <span className="text-right">
            <span className="data-value text-2xl leading-none font-semibold tracking-[-0.04em] text-zinc-950">
              {latestPair}
            </span>
            <span className="text-muted ml-1 text-xs">mmHg</span>
          </span>
        )}
      </div>
      {chartData.length > 0 ? (
        <div
          role="img"
          aria-label={`Blood pressure, ${formatDateSpan(
            [...systolic, ...diastolic].map((d) => d.date).sort(),
          )}: ${summary}.`}
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
                interval={0}
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
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="systolic"
                name="Systolic"
                stroke="var(--accent)"
                strokeWidth={2.25}
                dot={{ r: 2.5, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "var(--accent)", strokeWidth: 2 }}
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
