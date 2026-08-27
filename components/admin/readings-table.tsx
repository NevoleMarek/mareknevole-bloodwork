"use client";

import type { ReadingSummary } from "@/types/bloodwork";

export function ReadingsTable({
  readings,
  onDelete,
}: {
  readings: ReadingSummary[];
  onDelete: (id: string) => void;
}) {
  if (readings.length === 0) {
    return <p className="text-xs text-zinc-400">No readings yet.</p>;
  }

  return (
    <div className="admin-table-scroll overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">Imported bloodwork readings</caption>
        <thead>
          <tr className="text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
            <th scope="col" className="px-4 py-3 text-left">
              Date
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              Source
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              Markers
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-zinc-900">
          {readings.map((r) => (
            <tr key={r.id} className="border-t border-zinc-900/8">
              <th
                scope="row"
                className="data-value px-4 py-3 text-left font-medium"
              >
                {r.date}
              </th>
              <td className="max-w-64 truncate px-4 py-3 text-zinc-600">
                {r.source}
              </td>
              <td className="data-value px-4 py-3 text-zinc-600">
                {r.measurementCount}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="min-h-9 rounded-full px-3 text-xs font-semibold text-red-700"
                  aria-label={`Delete reading from ${r.date}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
