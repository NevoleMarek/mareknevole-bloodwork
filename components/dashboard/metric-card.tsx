import type { Status } from "@/types/bloodwork";

import { RangeBar } from "@/components/dashboard/range-bar";

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
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        {label}
      </div>
      <div className="mb-1 text-3xl font-bold text-zinc-900">{value}</div>
      <div className="mb-2.5 text-xs text-zinc-500">{unit}</div>
      <RangeBar value={value} min={min} max={max} status={status} />
    </div>
  );
}
