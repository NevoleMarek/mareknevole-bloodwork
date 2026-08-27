"use client";

import type {
  InterpretationProvenance,
  InterpretationReviewStatus,
} from "@/types/bloodwork";
import type { ResearchedEntry } from "@/types/wizard";

type Props = {
  researched: ResearchedEntry[];
  onResearchedChange: (entries: ResearchedEntry[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
};

function isInterpretationReviewStatus(
  value: string,
): value is InterpretationReviewStatus {
  return value === "pending_review" || value === "approved";
}

export function StepReviewResearch({
  researched,
  onResearchedChange,
  onBack,
  onSave,
  saving,
}: Props) {
  function setReviewStatus(
    entry: ResearchedEntry,
    reviewStatus: InterpretationReviewStatus,
  ): InterpretationProvenance {
    const current = entry.interpretation;
    return {
      source: current?.source ?? "ai",
      model: current?.model ?? null,
      generatedAt: current?.generatedAt ?? null,
      version: current?.version ?? 1,
      reviewStatus,
      reviewedAt:
        reviewStatus === "approved" ? (current?.reviewedAt ?? null) : null,
      reviewedBy:
        reviewStatus === "approved" ? (current?.reviewedBy ?? null) : null,
      updatedAt: current?.updatedAt ?? null,
    };
  }

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
      <p className="mb-5 max-w-2xl text-xs leading-5 text-zinc-600">
        Research is AI-assisted and starts as pending review. Edit the context
        if needed, then approve it explicitly before it is presented as reviewed
        information.
      </p>
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
            <label className="mb-4 block sm:max-w-md">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Review state
              </span>
              <select
                aria-label={`${entry.vocabularyKey} interpretation review state`}
                value={entry.interpretation?.reviewStatus ?? "pending_review"}
                onChange={(event) => {
                  if (!isInterpretationReviewStatus(event.target.value)) return;
                  updateEntry(i, {
                    interpretation: setReviewStatus(entry, event.target.value),
                  });
                }}
                className="field w-full text-sm"
              >
                <option value="pending_review">Pending review</option>
                <option value="approved">Approve for display</option>
              </select>
            </label>
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
