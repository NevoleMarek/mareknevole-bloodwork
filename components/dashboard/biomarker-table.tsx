import { statusLabel, statusStyle } from "@/components/dashboard/metric-card";
import type { Status } from "@/types/bloodwork";

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
  limitReached,
  onToggle,
  onIntent,
}: {
  metrics: BiomarkerMetric[];
  selected: string[];
  limitReached: boolean;
  onToggle: (key: string) => void;
  onIntent: (key: string, pointerType: string) => void;
}) {
  return (
    <div>
      <table className="biomarker-table w-full border-separate border-spacing-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-zinc-900/10 sm:bg-white">
        <caption className="sr-only">
          Latest biomarker values and reference ranges. Select a row to add its
          trend.
        </caption>
        <thead>
          <tr className="text-muted text-xs font-semibold tracking-[0.07em] uppercase">
            <th className="w-px px-4 py-3 text-left font-semibold whitespace-nowrap">
              Status
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
              onPointerDown={(event) =>
                onIntent(m.vocabularyKey, event.pointerType)
              }
              onClick={() => onToggle(m.vocabularyKey)}
              className={`cursor-pointer ${
                selected.includes(m.vocabularyKey)
                  ? "bg-zinc-50 shadow-[inset_3px_0_0_var(--accent)]"
                  : "bg-white"
              }`}
            >
              <td className="sm:py-1 sm:pl-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(m.vocabularyKey);
                  }}
                  aria-pressed={selected.includes(m.vocabularyKey)}
                  aria-disabled={
                    (limitReached && !selected.includes(m.vocabularyKey)) ||
                    undefined
                  }
                  aria-label={`${m.label}: ${m.value} ${m.unit}, ${statusLabel[m.status]}. ${selected.includes(m.vocabularyKey) ? "Remove from trends" : "Add to trends"}`}
                  className="flex min-h-10 items-center rounded-full px-2"
                >
                  <span
                    className={`rounded-full px-2 py-1 text-xs leading-none font-semibold whitespace-nowrap ${statusStyle[m.status]}`}
                  >
                    {statusLabel[m.status]}
                  </span>
                </button>
              </td>
              <td className="text-sm sm:py-2.5 sm:font-medium">{m.label}</td>
              <td className="data-value sm:py-2.5 sm:text-sm sm:font-semibold">
                {m.value}
              </td>
              <td className="data-value text-muted text-xs sm:py-2.5">
                {m.min} – {m.max}
              </td>
              <td className="text-muted text-xs sm:py-2.5 sm:pr-4">{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
