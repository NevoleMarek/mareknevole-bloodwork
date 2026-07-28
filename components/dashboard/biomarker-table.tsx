import type { Status } from "@/types/bloodwork";

const statusColor: Record<Status, string> = {
  normal: "bg-emerald-600",
  borderline: "bg-amber-500",
  high: "bg-rose-500",
  low: "bg-sky-500",
};

const statusLabel: Record<Status, string> = {
  normal: "In range",
  borderline: "Borderline",
  high: "High",
  low: "Low",
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
    <div>
      <table className="biomarker-table w-full border-separate border-spacing-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-zinc-900/10 sm:bg-white">
        <caption className="sr-only">
          Latest biomarker values and reference ranges. Select a row to add its
          trend.
        </caption>
        <thead>
          <tr className="text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
            <th className="w-10 px-4 py-3 text-left font-semibold">
              <span className="sr-only">Status</span>
            </th>
            <th className="py-3 text-left font-semibold">Biomarker</th>
            <th className="py-3 text-left font-semibold">Value</th>
            <th className="py-3 text-left font-semibold">Reference</th>
            <th className="py-3 pr-4 text-left font-semibold">Unit</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr
              key={m.vocabularyKey}
              onClick={() => onToggle(m.vocabularyKey)}
              className={`cursor-pointer border-t border-zinc-100 ${
                selected.includes(m.vocabularyKey)
                  ? "bg-zinc-50 shadow-[inset_3px_0_0_#14775f]"
                  : "bg-white"
              }`}
            >
              <td className="py-1 pl-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(m.vocabularyKey);
                  }}
                  aria-pressed={selected.includes(m.vocabularyKey)}
                  aria-label={`${m.label}: ${m.value} ${m.unit}, ${statusLabel[m.status]}. ${selected.includes(m.vocabularyKey) ? "Remove from trends" : "Add to trends"}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                >
                  <span
                    aria-hidden="true"
                    title={statusLabel[m.status]}
                    className={`inline-block h-2 w-2 rounded-full ${statusColor[m.status]}`}
                  />
                </button>
              </td>
              <td className="py-2.5 text-sm font-medium">{m.label}</td>
              <td className="data-value py-2.5 text-sm font-semibold">
                {m.value}
              </td>
              <td className="data-value py-2.5 text-xs text-zinc-500">
                {m.min} – {m.max}
              </td>
              <td className="py-2.5 pr-4 text-xs text-zinc-500">{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
