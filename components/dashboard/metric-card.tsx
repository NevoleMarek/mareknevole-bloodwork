import type { Status } from "@/types/bloodwork";

import { RangeBar } from "@/components/dashboard/range-bar";

const statusLabel = {
  normal: "In range",
  borderline: "Borderline",
  high: "High",
  low: "Low",
} satisfies Record<Status, string>;

const statusStyle = {
  normal: "bg-emerald-50 text-emerald-800",
  borderline: "bg-amber-50 text-amber-800",
  high: "bg-rose-50 text-rose-800",
  low: "bg-sky-50 text-sky-800",
} satisfies Record<Status, string>;

export function MetricCard({
  label,
  value,
  unit,
  min,
  max,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: Status;
}) {
  return (
    <div className="surface interactive-card flex h-full min-h-[10.5rem] flex-col p-4 text-left sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.72rem] leading-4 font-semibold tracking-[0.04em] text-zinc-600 uppercase">
          {label}
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[0.62rem] leading-none font-semibold whitespace-nowrap ${statusStyle[status]}`}
        >
          {statusLabel[status]}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="data-value text-[2rem] leading-none font-semibold tracking-[-0.045em] text-zinc-950">
          {value}
        </span>
        <span className="text-xs text-zinc-500">{unit}</span>
      </div>
      <div className="mt-auto pt-5">
        <RangeBar value={value} min={min} max={max} status={status} />
      </div>
    </div>
  );
}
