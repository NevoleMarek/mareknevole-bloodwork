"use client";

import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  BloodworkReading,
  Status,
  VocabularyEntry,
} from "@/types/bloodwork";

type Metric = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: Status;
};

type Tab = "dashboard" | "data" | "vocabulary";

type ImportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done" }
  | { kind: "error"; message: string };

type DataState =
  | { kind: "loading" }
  | {
      kind: "ready";
      vocabulary: VocabularyEntry[];
      readings: BloodworkReading[];
    };

// Bar fill darkness signals severity
const statusBarFill: Record<Status, string> = {
  normal: "bg-zinc-300",
  borderline: "bg-zinc-600",
  high: "bg-zinc-900",
  low: "bg-zinc-400",
};

const statusText: Record<Status, string> = {
  normal: "text-zinc-400",
  borderline: "text-zinc-700",
  high: "text-zinc-900 font-semibold",
  low: "text-zinc-500",
};

function statusLabel(status: Status): string {
  if (status === "normal") return "normal";
  if (status === "borderline") return "borderline";
  if (status === "high") return "↑ high";
  if (status === "low") return "↓ low";
  throw new Error(`Unknown status: ${status}`);
}

function rangePercent(metric: Metric): number {
  const range = metric.max - metric.min;
  if (range === 0) return 100;
  return Math.min(
    100,
    Math.max(0, ((metric.value - metric.min) / range) * 100),
  );
}

function deriveMetrics(
  vocabulary: VocabularyEntry[],
  readings: BloodworkReading[],
): Metric[] {
  if (readings.length === 0) return [];
  const latest = readings[readings.length - 1];
  return latest.measurements.map((m) => {
    const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
    if (!entry) throw new Error(`Unknown vocabulary key: ${m.vocabularyKey}`);
    return {
      label: entry.label,
      value: m.value,
      unit: m.unit,
      min: entry.referenceRange.min,
      max: entry.referenceRange.max,
      status: m.status,
    };
  });
}

function deriveTrendData(
  vocabulary: VocabularyEntry[],
  readings: BloodworkReading[],
): Record<string, unknown>[] {
  return readings.map((r) => {
    const point: Record<string, unknown> = {
      date: new Date(r.date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    };
    for (const m of r.measurements) {
      const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
      if (entry) point[entry.label] = m.value;
    }
    return point;
  });
}

const STROKE_COLORS = ["#1a1a1a", "#555555", "#888888", "#bbbbbb"];
const STROKE_DASHES: (string | undefined)[] = [undefined, "6 3", "2 3", "10 4"];

function deriveTrendLines(trendData: Record<string, unknown>[]) {
  const allKeys = new Set<string>();
  for (const point of trendData) {
    for (const key of Object.keys(point)) {
      if (key !== "date") allKeys.add(key);
    }
  }
  return Array.from(allKeys)
    .slice(0, 4)
    .map((key, i) => ({
      key,
      stroke: STROKE_COLORS[i],
      dash: STROKE_DASHES[i],
    }));
}

const PERIODS: { label: string; count: number }[] = [
  { label: "6m", count: 3 },
  { label: "1y", count: 4 },
  { label: "All", count: Infinity },
];

// Box with + corners over CSS border lines. Corner spans use bg-[#f6f5f0] to
// cover the border junction so + reads as the corner, not an overlay.
function AsciiBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const c =
    "pointer-events-none absolute bg-[#f6f5f0] leading-none text-zinc-400 select-none";
  return (
    <div
      className={`relative border border-zinc-400 bg-[#f6f5f0] ${className ?? ""}`}
    >
      <span className={`${c} top-0 left-0 -translate-x-1/2 -translate-y-1/2`}>
        +
      </span>
      <span className={`${c} top-0 right-0 translate-x-1/2 -translate-y-1/2`}>
        +
      </span>
      <span className={`${c} bottom-0 left-0 -translate-x-1/2 translate-y-1/2`}>
        +
      </span>
      <span className={`${c} right-0 bottom-0 translate-x-1/2 translate-y-1/2`}>
        +
      </span>
      {children}
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <AsciiBox className="p-6">
      <p className="text-[10px] leading-6 tracking-widest text-zinc-400 uppercase">
        {metric.label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-xl leading-6 font-semibold text-zinc-900">
          {metric.value}
        </span>
        <span className="text-xs leading-6 text-zinc-400">{metric.unit}</span>
      </div>
      <div className="mt-6 flex h-6 items-center">
        <div className="h-px w-full bg-zinc-100">
          <div
            className={`h-full ${statusBarFill[metric.status]}`}
            style={{ width: `${rangePercent(metric)}%` }}
          />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className={`text-xs leading-6 ${statusText[metric.status]}`}>
          {statusLabel(metric.status)}
        </span>
        <span className="text-xs leading-6 text-zinc-400">
          {metric.min}–{metric.max}
        </span>
      </div>
    </AsciiBox>
  );
}

function DashboardTab({
  metrics,
  trendData,
  trendLines,
}: {
  metrics: Metric[];
  trendData: Record<string, unknown>[];
  trendLines: { key: string; stroke: string; dash?: string }[];
}) {
  const [hiddenVars, setHiddenVars] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1]);

  function toggleVar(key: string) {
    setHiddenVars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (trendLines.length - next.size <= 1) return prev;
        next.add(key);
      }
      return next;
    });
  }

  const visibleLines = trendLines.filter((l) => !hiddenVars.has(l.key));
  const visibleData = trendData.slice(-period.count);

  const normalCount = metrics.filter((m) => m.status === "normal").length;
  const borderlineCount = metrics.filter(
    (m) => m.status === "borderline",
  ).length;
  const highCount = metrics.filter((m) => m.status === "high").length;

  if (metrics.length === 0) {
    return (
      <p className="text-xs text-zinc-400">
        No data yet — import a PDF to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="grid grid-cols-4 gap-6">
        <div className="flex items-center">
          <p className="text-xs text-zinc-400">Latest results</p>
        </div>
        <AsciiBox className="px-6 py-6 text-center">
          <p className="text-xl leading-6 font-semibold text-zinc-900">
            {normalCount}
          </p>
          <p className="text-[10px] leading-6 tracking-widest text-zinc-400 uppercase">
            Normal
          </p>
        </AsciiBox>
        <AsciiBox className="px-6 py-6 text-center">
          <p className="text-xl leading-6 font-semibold text-zinc-900">
            {borderlineCount}
          </p>
          <p className="text-[10px] leading-6 tracking-widest text-zinc-400 uppercase">
            Borderline
          </p>
        </AsciiBox>
        <AsciiBox className="px-6 py-6 text-center">
          <p className="text-xl leading-6 font-semibold text-zinc-900">
            {highCount}
          </p>
          <p className="text-[10px] leading-6 tracking-widest text-zinc-400 uppercase">
            High
          </p>
        </AsciiBox>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {trendData.length > 1 && (
        <AsciiBox className="p-6">
          <div className="mb-6 flex items-center justify-between gap-6">
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase">
              Trends over time
            </p>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {trendLines.map((line) => (
                  <button
                    key={line.key}
                    onClick={() => toggleVar(line.key)}
                    className={`cursor-pointer text-[10px] tracking-widest uppercase transition-[transform,color] duration-75 hover:-translate-y-px active:translate-y-px ${
                      !hiddenVars.has(line.key)
                        ? "text-zinc-700"
                        : "text-zinc-300 hover:text-zinc-500"
                    }`}
                  >
                    {line.key}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 border border-zinc-200">
                {PERIODS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPeriod(p)}
                    className={`cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase transition-[transform,color,background-color] duration-75 hover:-translate-y-px active:translate-y-px ${
                      period.label === p.label
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={visibleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="date"
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "#f6f5f0",
                  border: "1px solid #d4d4d8",
                  borderRadius: 0,
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#71717a" }}
                itemStyle={{ color: "#1a1a1a" }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "#a1a1aa",
                  fontFamily: "monospace",
                }}
              />
              {visibleLines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.stroke}
                  strokeWidth={1.5}
                  strokeDasharray={line.dash}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </AsciiBox>
      )}

      <AsciiBox className="p-6">
        <p className="mb-6 text-[10px] tracking-widest text-zinc-400 uppercase">
          Reference ranges
        </p>
        <div className="flex flex-col gap-6">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center gap-6">
              <span className="w-36 shrink-0 text-xs text-zinc-400">
                {m.label}
              </span>
              <div className="relative h-px flex-1 bg-zinc-100">
                <div
                  className={`absolute top-0 left-0 h-full ${statusBarFill[m.status]}`}
                  style={{ width: `${rangePercent(m)}%` }}
                />
              </div>
              <span
                className={`w-24 shrink-0 text-right text-xs ${statusText[m.status]}`}
              >
                {m.value} {m.unit}
              </span>
            </div>
          ))}
        </div>
      </AsciiBox>
    </div>
  );
}

function DataTab({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) {
    return (
      <p className="text-xs text-zinc-400">
        No data yet — import a PDF to get started.
      </p>
    );
  }

  return (
    <AsciiBox>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="px-6 py-6 text-left leading-6 tracking-widest text-zinc-400 uppercase">
              Test
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Value
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Unit
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Range
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr
              key={m.label}
              className={
                i < metrics.length - 1 ? "border-b border-zinc-100" : ""
              }
            >
              <td className="px-6 py-6 leading-6 text-zinc-900">{m.label}</td>
              <td className="px-6 py-6 text-right leading-6 text-zinc-700">
                {m.value}
              </td>
              <td className="px-6 py-6 text-right leading-6 text-zinc-400">
                {m.unit}
              </td>
              <td className="px-6 py-6 text-right leading-6 text-zinc-400">
                {m.min}–{m.max}
              </td>
              <td
                className={`px-6 py-6 text-right leading-6 ${statusText[m.status]}`}
              >
                {statusLabel(m.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AsciiBox>
  );
}

type VocabEditing =
  | { kind: "none" }
  | {
      kind: "editing";
      key: string;
      label: string;
      unit: string;
      min: string;
      max: string;
    }
  | { kind: "adding"; label: string; unit: string; min: string; max: string };

const inputCls =
  "bg-transparent border-b border-zinc-400 text-xs text-zinc-900 outline-none w-full";

function VocabularyTab({
  vocabulary,
  onRefresh,
}: {
  vocabulary: VocabularyEntry[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<VocabEditing>({ kind: "none" });

  function startEdit(e: VocabularyEntry) {
    setEditing({
      kind: "editing",
      key: e.key,
      label: e.label,
      unit: e.unit,
      min: String(e.referenceRange.min),
      max: String(e.referenceRange.max),
    });
  }

  async function saveEdit() {
    if (editing.kind !== "editing") return;
    await fetch("/api/vocabulary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: {
          key: editing.key,
          label: editing.label,
          unit: editing.unit,
          referenceRange: {
            min: Number(editing.min),
            max: Number(editing.max),
          },
        },
      }),
    });
    setEditing({ kind: "none" });
    onRefresh();
  }

  async function saveAdd() {
    if (editing.kind !== "adding") return;
    const key = editing.label.toLowerCase().replace(/\s+/g, "_");
    await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: {
          key,
          label: editing.label,
          unit: editing.unit,
          referenceRange: {
            min: Number(editing.min),
            max: Number(editing.max),
          },
        },
      }),
    });
    setEditing({ kind: "none" });
    onRefresh();
  }

  async function deleteEntry(key: string) {
    await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    onRefresh();
  }

  return (
    <AsciiBox>
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-6">
        <span className="text-[10px] leading-6 tracking-widest text-zinc-400 uppercase">
          Vocabulary
        </span>
        {editing.kind === "none" && (
          <button
            onClick={() =>
              setEditing({
                kind: "adding",
                label: "",
                unit: "",
                min: "",
                max: "",
              })
            }
            className="cursor-pointer text-[10px] tracking-widest text-zinc-400 uppercase transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-700 active:translate-y-px"
          >
            + Add
          </button>
        )}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="px-6 py-6 text-left leading-6 tracking-widest text-zinc-400 uppercase">
              Test
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Unit
            </th>
            <th className="px-6 py-6 text-right leading-6 tracking-widest text-zinc-400 uppercase">
              Reference Range
            </th>
            <th className="px-6 py-6" />
          </tr>
        </thead>
        <tbody>
          {vocabulary.map((e, i) => {
            const isEditing =
              editing.kind === "editing" && editing.key === e.key;
            const isLast =
              i === vocabulary.length - 1 && editing.kind !== "adding";
            return (
              <tr
                key={e.key}
                className={isLast ? "" : "border-b border-zinc-100"}
              >
                {isEditing ? (
                  <>
                    <td className="px-6 py-6">
                      <input
                        className={inputCls}
                        value={editing.label}
                        onChange={(ev) =>
                          setEditing({ ...editing, label: ev.target.value })
                        }
                      />
                    </td>
                    <td className="px-6 py-6">
                      <input
                        className={inputCls + " text-right"}
                        value={editing.unit}
                        onChange={(ev) =>
                          setEditing({ ...editing, unit: ev.target.value })
                        }
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          className={inputCls + " w-16 text-right"}
                          value={editing.min}
                          onChange={(ev) =>
                            setEditing({ ...editing, min: ev.target.value })
                          }
                        />
                        <span className="text-zinc-400">–</span>
                        <input
                          className={inputCls + " w-16 text-right"}
                          value={editing.max}
                          onChange={(ev) =>
                            setEditing({ ...editing, max: ev.target.value })
                          }
                        />
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={saveEdit}
                          className="cursor-pointer text-zinc-700 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-900 active:translate-y-px"
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditing({ kind: "none" })}
                          className="cursor-pointer text-zinc-400 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-600 active:translate-y-px"
                        >
                          cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-6 leading-6 text-zinc-900">
                      {e.label}
                    </td>
                    <td className="px-6 py-6 text-right leading-6 text-zinc-400">
                      {e.unit}
                    </td>
                    <td className="px-6 py-6 text-right leading-6 text-zinc-400">
                      {e.referenceRange.min}–{e.referenceRange.max}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(e)}
                          className="cursor-pointer text-zinc-400 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-700 active:translate-y-px"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => deleteEntry(e.key)}
                          className="cursor-pointer text-zinc-400 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-900 active:translate-y-px"
                        >
                          delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          {editing.kind === "adding" && (
            <tr>
              <td className="px-6 py-6">
                <input
                  className={inputCls}
                  placeholder="Label"
                  value={editing.label}
                  autoFocus
                  onChange={(ev) =>
                    setEditing({ ...editing, label: ev.target.value })
                  }
                />
              </td>
              <td className="px-6 py-6">
                <input
                  className={inputCls + " text-right"}
                  placeholder="Unit"
                  value={editing.unit}
                  onChange={(ev) =>
                    setEditing({ ...editing, unit: ev.target.value })
                  }
                />
              </td>
              <td className="px-6 py-6">
                <div className="flex items-center justify-end gap-1">
                  <input
                    className={inputCls + " w-16 text-right"}
                    placeholder="Min"
                    value={editing.min}
                    onChange={(ev) =>
                      setEditing({ ...editing, min: ev.target.value })
                    }
                  />
                  <span className="text-zinc-400">–</span>
                  <input
                    className={inputCls + " w-16 text-right"}
                    placeholder="Max"
                    value={editing.max}
                    onChange={(ev) =>
                      setEditing({ ...editing, max: ev.target.value })
                    }
                  />
                </div>
              </td>
              <td className="px-6 py-6 text-right">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={saveAdd}
                    className="cursor-pointer text-zinc-700 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-900 active:translate-y-px"
                  >
                    save
                  </button>
                  <button
                    onClick={() => setEditing({ kind: "none" })}
                    className="cursor-pointer text-zinc-400 transition-[transform,color] duration-75 hover:-translate-y-px hover:text-zinc-600 active:translate-y-px"
                  >
                    cancel
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AsciiBox>
  );
}

type AppDataBody = {
  vocabulary: { entries: VocabularyEntry[] };
  readings: BloodworkReading[];
};

function fetchAppData(): Promise<AppDataBody> {
  return fetch("/api/data").then((res) => res.json() as Promise<AppDataBody>);
}

function buildMarkdown(
  vocabulary: VocabularyEntry[],
  readings: BloodworkReading[],
): string {
  const lines: string[] = ["# Bloodwork Results", ""];

  // Results per reading
  for (const reading of [...readings].reverse()) {
    const date = new Date(reading.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    lines.push(`## ${date}`, "");
    lines.push("| Test | Value | Unit | Status |");
    lines.push("|------|-------|------|--------|");
    for (const m of reading.measurements) {
      const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
      const label = entry?.label ?? m.vocabularyKey;
      lines.push(`| ${label} | ${m.value} | ${m.unit} | ${m.status} |`);
    }
    lines.push("");
  }

  // Reference ranges (once, at the bottom)
  lines.push("## Reference Ranges", "");
  lines.push("| Test | Unit | Range |");
  lines.push("|------|------|-------|");
  for (const entry of vocabulary) {
    lines.push(
      `| ${entry.label} | ${entry.unit} | ${entry.referenceRange.min}–${entry.referenceRange.max} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function HomeDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [dataState, setDataState] = useState<DataState>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAppData().then((body) => {
      setDataState({
        kind: "ready",
        vocabulary: body.vocabulary.entries,
        readings: body.readings,
      });
    });
  }, []);

  function copyMarkdown() {
    if (dataState.kind !== "ready") return;
    const md = buildMarkdown(dataState.vocabulary, dataState.readings);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setImportState({ kind: "loading" });

    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/extract", { method: "POST", body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setImportState({
        kind: "error",
        message: (body as { error?: string }).error ?? "Extraction failed",
      });
      return;
    }

    setImportState({ kind: "done" });
    e.currentTarget.value = "";
    const body = await fetchAppData();
    setDataState({
      kind: "ready",
      vocabulary: body.vocabulary.entries,
      readings: body.readings,
    });
  }

  const metrics =
    dataState.kind === "ready"
      ? deriveMetrics(dataState.vocabulary, dataState.readings)
      : [];

  const trendData =
    dataState.kind === "ready"
      ? deriveTrendData(dataState.vocabulary, dataState.readings)
      : [];

  const trendLines = deriveTrendLines(trendData);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[984px] flex-col gap-6 px-6 py-12">
      <div className="flex h-12 items-center justify-between gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Bloodwork
        </h1>
        <div className="flex items-center gap-6">
          {importState.kind === "error" && (
            <p className="text-xs text-zinc-500">{importState.message}</p>
          )}
          {importState.kind === "done" && (
            <p className="text-xs text-zinc-400">Imported</p>
          )}
          <button
            onClick={copyMarkdown}
            disabled={
              dataState.kind !== "ready" || dataState.readings.length === 0
            }
            className="relative cursor-pointer border border-zinc-400 bg-[#f6f5f0] px-6 py-3 text-xs tracking-widest text-zinc-700 uppercase transition-[transform,border-color] duration-75 hover:-translate-y-px hover:border-zinc-700 active:translate-y-px active:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <span className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            {copied ? "Copied!" : "Copy as Markdown"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importState.kind === "loading"}
            className="relative cursor-pointer border border-zinc-400 bg-[#f6f5f0] px-6 py-3 text-xs tracking-widest text-zinc-700 uppercase transition-[transform,border-color] duration-75 hover:-translate-y-px hover:border-zinc-700 active:translate-y-px active:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <span className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            <span className="pointer-events-none absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 bg-[#f6f5f0] leading-none text-zinc-400 select-none">
              +
            </span>
            {importState.kind === "loading" ? "Importing…" : "Import PDF"}
          </button>
        </div>
      </div>

      <div className="flex h-12 items-end gap-6 border-b border-zinc-200 bg-[#f6f5f0]">
        {(["dashboard", "data", "vocabulary"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mb-[-1px] cursor-pointer pb-3 text-xs tracking-widest uppercase transition-[transform,color] duration-75 hover:-translate-y-px active:translate-y-px ${
              activeTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {dataState.kind === "loading" ? (
        <p className="text-xs text-zinc-400">Loading…</p>
      ) : activeTab === "dashboard" ? (
        <DashboardTab
          metrics={metrics}
          trendData={trendData}
          trendLines={trendLines}
        />
      ) : activeTab === "data" ? (
        <DataTab metrics={metrics} />
      ) : (
        <VocabularyTab
          vocabulary={dataState.vocabulary}
          onRefresh={() =>
            fetchAppData().then((body) =>
              setDataState({
                kind: "ready",
                vocabulary: body.vocabulary.entries,
                readings: body.readings,
              }),
            )
          }
        />
      )}
    </main>
  );
}
