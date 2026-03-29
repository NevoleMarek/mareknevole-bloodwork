"use client";

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
          isNew: true,
        };
      }
      const entry = vocabulary.find((v) => v.key === newKey);
      if (!entry) return m;
      return {
        ...m,
        vocabularyKey: entry.key,
        convertedUnit: entry.unit,
        isNew: false,
      };
    });
    onMappingsChange(updated);
  }

  return (
    <div>
      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        Variable Mapping
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="pr-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Extracted
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              &rarr;
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Maps To
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Value
            </th>
            <th className="pb-2 pl-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Unit
            </th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, i) => (
            <tr
              key={i}
              className={`border-b border-zinc-100 ${m.isNew ? "bg-stone-50" : ""}`}
            >
              <td className="py-2 pr-2 text-zinc-500">
                {m.label} ({m.originalValue} {m.originalUnit})
              </td>
              <td className="px-2 py-2 text-zinc-400">&rarr;</td>
              <td className="px-2 py-2">
                {m.isNew && (
                  <span className="mr-1 border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[9px] tracking-[1px] text-zinc-500 uppercase">
                    New
                  </span>
                )}
                <select
                  value={m.isNew ? "__new__" : m.vocabularyKey}
                  onChange={(e) => updateMapping(i, e.target.value)}
                  className="border border-zinc-200 px-1.5 py-1 text-xs"
                >
                  {vocabulary.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                  <option value="__new__">+ New entry</option>
                </select>
              </td>
              <td className="px-2 py-2 font-semibold">{m.convertedValue}</td>
              <td className="py-2 pl-2 text-zinc-500">{m.convertedUnit}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
