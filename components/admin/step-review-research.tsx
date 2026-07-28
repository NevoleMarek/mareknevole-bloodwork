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
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        New Biomarker Research
      </h2>
      <div className="space-y-4">
        {researched.map((entry, i) => (
          <div
            key={entry.vocabularyKey}
            className="rounded-2xl border border-zinc-900/10 bg-white p-4 sm:p-5"
          >
            <div className="mb-4 font-mono text-xs font-semibold text-zinc-900">
              {entry.vocabularyKey}
            </div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Description
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => updateEntry(i, { description: e.target.value })}
              rows={2}
              className="field mb-4 w-full text-sm text-zinc-900"
            />
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Ref Min
                </span>
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
                  className="field w-full text-sm"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Ref Max
                </span>
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
                  className="field w-full text-sm"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={onBack} className="button-secondary">
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="button-primary disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </div>
  );
}
