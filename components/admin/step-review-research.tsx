"use client";

import { useState } from "react";

import { isValidReferenceRange } from "@/lib/schemas/domain";
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
  const [rangeDrafts, setRangeDrafts] = useState(() =>
    researched.map((entry) => ({
      min:
        entry.referenceRange === undefined
          ? ""
          : String(entry.referenceRange.min),
      max:
        entry.referenceRange === undefined
          ? ""
          : String(entry.referenceRange.max),
    })),
  );
  const hasInvalidRange = researched.some(
    (entry) => !isValidReferenceRange(entry.referenceRange),
  );

  function updateEntry(index: number, patch: Partial<ResearchedEntry>) {
    onResearchedChange(
      researched.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  function updateRange(index: number, bound: "min" | "max", rawValue: string) {
    const entry = researched[index];
    const draft = rangeDrafts[index];
    if (entry === undefined || draft === undefined) return;
    const nextDraft = { ...draft, [bound]: rawValue };
    setRangeDrafts(
      rangeDrafts.map((currentDraft, draftIndex) =>
        draftIndex === index ? nextDraft : currentDraft,
      ),
    );
    const min = nextDraft.min.trim() === "" ? undefined : Number(nextDraft.min);
    const max = nextDraft.max.trim() === "" ? undefined : Number(nextDraft.max);
    const referenceRange =
      min === undefined || max === undefined ? undefined : { min, max };
    updateEntry(index, { referenceRange });
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        New Biomarker Research
      </h2>
      <p className="mb-5 text-sm text-zinc-600">
        Review the research below. Every new biomarker needs a finite reference
        interval with the minimum below the maximum before it can be saved.
      </p>
      <div className="space-y-4">
        {researched.map((entry, i) => {
          const draft = rangeDrafts[i] ?? { min: "", max: "" };
          return (
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
                onChange={(e) =>
                  updateEntry(i, { description: e.target.value })
                }
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
                    value={draft.min}
                    aria-invalid={!isValidReferenceRange(entry.referenceRange)}
                    onChange={(e) => updateRange(i, "min", e.target.value)}
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
                    value={draft.max}
                    aria-invalid={!isValidReferenceRange(entry.referenceRange)}
                    onChange={(e) => updateRange(i, "max", e.target.value)}
                    className="field w-full text-sm"
                  />
                </label>
              </div>
              {!isValidReferenceRange(entry.referenceRange) && (
                <p className="mt-3 text-xs font-medium text-red-700">
                  {entry.referenceRange === undefined
                    ? "No reviewed reference interval was returned. Enter both bounds to enable saving."
                    : "Reference interval must use finite numbers with the minimum below the maximum."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={onBack} className="button-secondary">
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || hasInvalidRange}
          className="button-primary disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </div>
  );
}
