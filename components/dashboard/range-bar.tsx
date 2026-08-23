import type { Status } from "@/types/bloodwork";

const statusMarkerColor = {
  normal: "bg-emerald-700",
  borderline: "bg-amber-600",
  high: "bg-rose-600",
  low: "bg-sky-600",
} satisfies Record<Status, string>;

function computePositions(value: number, min: number, max: number) {
  const range = max - min;
  if (range === 0) return { zoneLeft: 20, zoneWidth: 60, valuePos: 50 };
  const pad = range * 0.25;
  const viewMin = min - pad;
  const viewMax = max + pad;
  const span = viewMax - viewMin;
  const zoneLeft = ((min - viewMin) / span) * 100;
  const zoneWidth = (range / span) * 100;
  const valuePos = Math.min(97, Math.max(3, ((value - viewMin) / span) * 100));
  return { zoneLeft, zoneWidth, valuePos };
}

export function RangeBar({
  value,
  min,
  max,
  status,
}: {
  value: number;
  min: number;
  max: number;
  status: Status;
}) {
  const { zoneLeft, zoneWidth, valuePos } = computePositions(value, min, max);

  return (
    <div role="img" aria-label={`${value}; reference range ${min} to ${max}`}>
      <div className="relative h-1.5 overflow-visible rounded-full bg-zinc-100">
        <div
          data-testid="range-zone"
          className="absolute h-full rounded-full bg-emerald-400/30"
          style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }}
        />
        <div
          className={`absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_white] ${statusMarkerColor[status]}`}
          style={{ left: `${valuePos}%` }}
        />
      </div>
      <div className="data-value mt-1.5 flex justify-between text-[0.65rem] text-zinc-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
