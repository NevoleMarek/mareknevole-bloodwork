"use client";

import type { BloodworkReading } from "@/types/bloodwork";

export function ReadingsTable({
  readings,
  onDelete,
}: {
  readings: BloodworkReading[];
  onDelete: (date: string) => void;
}) {
  if (readings.length === 0) {
    return <p className="text-xs text-zinc-400">No readings yet.</p>;
  }

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
          <td className="pb-2">Date</td>
          <td className="pb-2">Source</td>
          <td className="pb-2">Markers</td>
          <td className="pb-2"></td>
        </tr>
      </thead>
      <tbody className="text-zinc-900">
        {[...readings].reverse().map((r) => (
          <tr key={r.date} className="border-t border-zinc-100">
            <td className="py-1.5">{r.date}</td>
            <td className="py-1.5 text-zinc-500">{r.source}</td>
            <td className="py-1.5 text-zinc-500">{r.measurements.length}</td>
            <td className="py-1.5 text-right">
              <button
                type="button"
                onClick={() => onDelete(r.date)}
                className="text-zinc-400 hover:text-red-400"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
