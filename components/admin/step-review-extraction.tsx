"use client";

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
    onVariablesChange(variables.filter((_, i) => i !== index));
  }

  function addVariable() {
    onVariablesChange([...variables, { label: "", value: 0, unit: "" }]);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
          Test Date
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="border border-zinc-200 px-2.5 py-1.5 text-xs"
        />
      </div>

      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        Extracted Variables
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="pr-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Label
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Value
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Unit
            </th>
            <th className="w-8 pb-2 pl-2" />
          </tr>
        </thead>
        <tbody>
          {variables.map((v, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="py-2 pr-2">
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(i, "label", e.target.value)}
                  className="w-full border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  step="any"
                  value={v.value}
                  onChange={(e) => updateVariable(i, "value", e.target.value)}
                  className="w-20 border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  value={v.unit}
                  onChange={(e) => updateVariable(i, "unit", e.target.value)}
                  className="w-20 border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="py-2 pl-2 text-center">
                <button
                  type="button"
                  onClick={() => deleteVariable(i)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addVariable}
        className="mt-3 border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700"
      >
        + Add variable
      </button>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={variables.length === 0}
          className="bg-zinc-900 px-5 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          Next: Map Variables &rarr;
        </button>
      </div>
    </div>
  );
}
