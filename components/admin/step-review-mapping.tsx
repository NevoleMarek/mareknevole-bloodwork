"use client";

import { convertUnitValue } from "@/lib/unit-conversion";
import type { VocabularyEntry } from "@/types/bloodwork";
import type { MappedVariable } from "@/types/wizard";

type Props = {
  mappings: MappedVariable[];
  vocabulary: VocabularyEntry[];
  onMappingsChange: (mappings: MappedVariable[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
};

export function StepReviewMapping({
  mappings,
  vocabulary,
  onMappingsChange,
  onBack,
  onSave,
  saving,
}: Props) {
  function updateMapping(index: number, newKey: string) {
    const updated = mappings.map((m, i) => {
      if (i !== index) return m;
      if (newKey === "__new__") {
        return {
          ...m,
          vocabularyKey: m.label.toLowerCase().replace(/\s+/g, "_"),
          convertedValue: m.originalValue,
          convertedUnit: m.originalUnit,
          isNew: true,
          referenceRange: undefined,
        };
      }
      const entry = vocabulary.find((v) => v.key === newKey);
      if (!entry) return m;
      const convertedValue = convertUnitValue(
        m.originalValue,
        m.originalUnit,
        entry.unit,
        entry.key,
      );
      if (convertedValue === null) return m;
      return {
        ...m,
        vocabularyKey: entry.key,
        convertedValue,
        convertedUnit: entry.unit,
        isNew: false,
        referenceRange: undefined,
      };
    });
    onMappingsChange(updated);
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        Variable Mapping
      </h2>
      <div className="admin-table-scroll overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Biomarker vocabulary mapping</caption>
          <thead>
            <tr className="text-left text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
              <th className="px-4 py-3">Extracted</th>
              <th className="px-4 py-3">
                <span className="sr-only">Maps to</span>
              </th>
              <th className="px-4 py-3">Maps To</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Unit</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr
                key={i}
                className={`border-t border-zinc-900/8 ${m.isNew ? "bg-emerald-50/45" : ""}`}
              >
                <td className="px-4 py-3 text-zinc-600">
                  {m.label} ({m.originalValue} {m.originalUnit})
                </td>
                <td className="px-4 py-3 text-zinc-400">&rarr;</td>
                <td className="px-4 py-3">
                  {m.isNew && (
                    <span className="mr-2 rounded-full bg-emerald-50 px-2 py-1 text-[0.65rem] font-semibold text-emerald-800 uppercase">
                      New
                    </span>
                  )}
                  <select
                    value={m.isNew ? "__new__" : m.vocabularyKey}
                    onChange={(e) => updateMapping(i, e.target.value)}
                    aria-label={`Map ${m.label} to vocabulary`}
                    className="field text-sm"
                  >
                    {vocabulary.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                    <option value="__new__">+ New entry</option>
                  </select>
                </td>
                <td className="data-value px-4 py-3 font-semibold">
                  {m.convertedValue}
                </td>
                <td className="px-4 py-3 text-zinc-600">{m.convertedUnit}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
