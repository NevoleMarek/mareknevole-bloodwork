"use client";

import type { Supplement, SupplementChangelog } from "@/types/bloodwork";
import { Accordion } from "@/components/ui/accordion";

export function SupplementStack({
  supplements,
  changelog,
  lastUpdated,
}: {
  supplements: Supplement[];
  changelog: SupplementChangelog[];
  lastUpdated: string;
}) {
  const summary = (
    <div className="flex items-baseline gap-3">
      <span className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Supplement Stack
      </span>
      <span className="text-[10px] text-zinc-500">
        {supplements.length} active · updated {lastUpdated}
      </span>
    </div>
  );

  return (
    <Accordion summary={summary}>
      <div className="border-t border-zinc-200 p-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100">
                <td className="py-1.5">{s.name}</td>
                <td className="py-1.5 text-zinc-500">{s.dose}</td>
                <td className="py-1.5 text-zinc-500">{s.frequency}</td>
                <td className="py-1.5 text-zinc-400">{s.startedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {changelog.length > 0 && (
        <div className="border-t border-zinc-200 p-4">
          <div className="mb-2.5 text-[9px] tracking-[2px] text-zinc-400 uppercase">
            Changelog
          </div>
          <div className="space-y-1 text-[10px] text-zinc-500">
            {changelog.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <span className="whitespace-nowrap text-zinc-400">
                  {entry.date}
                </span>
                <span>{entry.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Accordion>
  );
}
