import type { Status } from "@/types/bloodwork";

const statusZoneColor: Record<Status, string> = {
  normal: "bg-green-400/30",
  borderline: "bg-amber-400/30",
  high: "bg-red-400/30",
  low: "bg-blue-400/30",
};

function computePositions(
  value: number,
  min: number,
  max: number,
): { zoneLeft: number; zoneWidth: number; valuePos: number } {
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
    <div>
      <div className="relative h-1 bg-zinc-100">
        <div
          data-testid="range-zone"
          className={`absolute h-full ${statusZoneColor[status]}`}
          style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }}
        />
        <div
          className="absolute top-[-2px] h-2 w-[3px] rounded-sm bg-zinc-900"
          style={{ left: `${valuePos}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
