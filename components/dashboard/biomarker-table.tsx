import type { Status } from "@/types/bloodwork";

const statusColor: Record<Status, string> = {
  normal: "bg-green-400/60",
  borderline: "bg-amber-400/60",
  high: "bg-red-400/60",
  low: "bg-blue-400/60",
};

export type BiomarkerMetric = {
  vocabularyKey: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: Status;
};

export function BiomarkerTable({
  metrics,
  selected,
  onToggle,
}: {
  metrics: BiomarkerMetric[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-zinc-200 bg-white">
        <thead>
          <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
            <th className="pt-2.5 pb-2 pl-4 text-left font-normal" />
            <th className="pt-2.5 pb-2 text-left font-normal">Biomarker</th>
            <th className="pt-2.5 pb-2 text-left font-normal">Value</th>
            <th className="pt-2.5 pb-2 text-left font-normal">Reference</th>
            <th className="pt-2.5 pr-4 pb-2 text-left font-normal">Unit</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr
              key={m.vocabularyKey}
              onClick={() => onToggle(m.vocabularyKey)}
              className={`cursor-pointer border-t border-zinc-100 transition-colors ${
                selected.includes(m.vocabularyKey)
                  ? "bg-zinc-50 hover:bg-zinc-100"
                  : "hover:bg-zinc-100"
              }`}
            >
              <td className="py-2 pl-4">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor[m.status]}`}
                />
              </td>
              <td className="py-2 text-[13px] font-semibold">{m.label}</td>
              <td className="py-2 text-[13px] font-bold">{m.value}</td>
              <td className="py-2 text-[12px] text-zinc-500">
                {m.min} – {m.max}
              </td>
              <td className="py-2 pr-4 text-[12px] text-zinc-500">{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
