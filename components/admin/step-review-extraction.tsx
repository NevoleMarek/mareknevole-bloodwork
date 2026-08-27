"use client";

import { useState } from "react";

import type { ExtractedVariable } from "@/types/wizard";

type Props = {
  date: string;
  variables: ExtractedVariable[];
  onDateChange: (date: string) => void;
  onVariablesChange: (variables: ExtractedVariable[]) => void;
  onNext: () => void;
};

export function StepReviewExtraction({
  date,
  variables,
  onDateChange,
  onVariablesChange,
  onNext,
}: Props) {
  const [latestAddedIndex, setLatestAddedIndex] = useState<number | null>(null);

  function updateVariable(
    index: number,
    field: keyof ExtractedVariable,
    raw: string,
  ) {
    const updated = variables.map((v, i) => {
      if (i !== index) return v;
      if (field === "value") return { ...v, value: parseFloat(raw) || 0 };
      return { ...v, [field]: raw };
    });
    onVariablesChange(updated);
  }

  function deleteVariable(index: number) {
    setLatestAddedIndex(null);
    onVariablesChange(variables.filter((_, i) => i !== index));
  }

  function addVariable() {
    setLatestAddedIndex(variables.length);
    onVariablesChange([...variables, { label: "", value: 0, unit: "" }]);
  }

  return (
    <form
      aria-label="Review extracted variables"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <div className="mb-6">
        <label
          htmlFor="test-date"
          className="mb-2 block text-xs font-semibold text-zinc-700"
        >
          Test Date
        </label>
        <input
          id="test-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="field text-sm"
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        Extracted Variables
      </h2>
      <div className="admin-table-scroll overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Extracted biomarker variables</caption>
          <thead>
            <tr className="text-left text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
              <th scope="col" className="px-4 py-3 text-left">
                Label
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Value
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Unit
              </th>
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v, i) => (
              <tr
                key={i}
                data-new={latestAddedIndex === i || undefined}
                className="extraction-variable-row border-t border-zinc-900/8"
              >
                <th scope="row" className="p-2 pl-4 text-left font-normal">
                  <div className="extraction-variable-cell">
                    <input
                      value={v.label}
                      onChange={(e) =>
                        updateVariable(i, "label", e.target.value)
                      }
                      aria-label={`Variable ${i + 1} label`}
                      className="field w-full text-sm"
                    />
                  </div>
                </th>
                <td className="p-2">
                  <div className="extraction-variable-cell">
                    <input
                      type="number"
                      step="any"
                      value={v.value}
                      onChange={(e) =>
                        updateVariable(i, "value", e.target.value)
                      }
                      aria-label={`${v.label || `Variable ${i + 1}`} value`}
                      className="field w-24 text-sm"
                    />
                  </div>
                </td>
                <td className="p-2">
                  <div className="extraction-variable-cell">
                    <input
                      value={v.unit}
                      onChange={(e) =>
                        updateVariable(i, "unit", e.target.value)
                      }
                      aria-label={`${v.label || `Variable ${i + 1}`} unit`}
                      className="field w-24 text-sm"
                    />
                  </div>
                </td>
                <td className="p-2 pr-4 text-center">
                  <div className="extraction-variable-cell flex justify-center">
                    <button
                      type="button"
                      onClick={() => deleteVariable(i)}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-red-700"
                      aria-label={`Remove ${v.label || `variable ${i + 1}`}`}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addVariable}
        className="button-secondary mt-4"
      >
        + Add variable
      </button>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={variables.length === 0}
          className="button-primary disabled:opacity-40"
        >
          Next: Map Variables &rarr;
        </button>
      </div>
    </form>
  );
}
