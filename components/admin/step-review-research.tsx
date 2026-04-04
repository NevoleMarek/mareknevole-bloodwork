"use client";

import type { ResearchedEntry } from "@/types/wizard";

type Props = {
  researched: ResearchedEntry[];
  onResearchedChange: (entries: ResearchedEntry[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
};

export function StepReviewResearch({
  researched,
  onResearchedChange,
  onBack,
  onSave,
  saving,
}: Props) {
  function updateEntry(index: number, patch: Partial<ResearchedEntry>) {
    onResearchedChange(
      researched.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  return (
    <div>
      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        New Biomarker Research
      </div>
      <div className="space-y-4">
        {researched.map((entry, i) => (
          <div key={entry.vocabularyKey} className="border border-zinc-200 p-4">
            <div className="mb-2 text-xs font-semibold text-zinc-900">
              {entry.vocabularyKey}
            </div>
            <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
              Description
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => updateEntry(i, { description: e.target.value })}
              rows={2}
              className="mb-3 w-full border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900"
            />
            <div className="flex gap-4">
              <div>
                <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
                  Ref Min
                </label>
                <input
                  type="number"
                  step="any"
                  value={entry.referenceRange.min}
                  onChange={(e) =>
                    updateEntry(i, {
                      referenceRange: {
                        ...entry.referenceRange,
                        min: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
                  Ref Max
                </label>
                <input
                  type="number"
                  step="any"
                  value={entry.referenceRange.max}
                  onChange={(e) =>
                    updateEntry(i, {
                      referenceRange: {
                        ...entry.referenceRange,
                        max: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border border-zinc-200 px-5 py-2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-zinc-900 px-5 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </div>
  );
}
