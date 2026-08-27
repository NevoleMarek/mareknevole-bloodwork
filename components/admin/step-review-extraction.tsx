"use client";

import { useState } from "react";

import { isValidSpecimenDate } from "@/lib/date";
import type { ExtractedVariable } from "@/types/wizard";

type Props = {
  date: string | null;
  variables: ExtractedVariable[];
  onDateChange: (date: string) => void;
  onVariablesChange: (variables: ExtractedVariable[]) => void;
  onNext: (date: string) => void;
};

export function StepReviewExtraction({
  date,
  variables,
  onDateChange,
  onVariablesChange,
  onNext,
}: Props) {
  const [latestAddedIndex, setLatestAddedIndex] = useState<number | null>(null);
  const dateValue = date ?? "";
  const validDate = isValidSpecimenDate(dateValue);

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
    <div>
      <div className="mb-6">
        <label
          htmlFor="test-date"
          className="mb-2 block text-xs font-semibold text-zinc-700"
        >
          Specimen collection date <span aria-hidden="true">(required)</span>
        </label>
        <p id="test-date-help" className="mb-2 text-xs leading-5 text-zinc-500">
          Enter the date the sample was collected. The file upload date is not
          used as the specimen date.
        </p>
        <input
          id="test-date"
          type="date"
          required
          aria-describedby="test-date-help test-date-error"
          aria-invalid={!validDate}
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          className="field text-sm"
        />
        {!validDate && (
          <p
            id="test-date-error"
            role="alert"
            className="mt-2 text-xs text-red-700"
          >
            A valid specimen collection date is required before continuing.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        Extracted Variables
      </h2>
      <div className="admin-table-scroll overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Extracted biomarker variables</caption>
          <thead>
            <tr className="text-left text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Unit</th>
              <th className="w-12 px-4 py-3">
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
                <td className="p-2 pl-4">
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
                </td>
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
          type="button"
          onClick={() => onNext(dateValue)}
          disabled={variables.length === 0 || !validDate}
          className="button-primary disabled:opacity-40"
        >
          Next: Map Variables &rarr;
        </button>
      </div>
    </div>
  );
}
