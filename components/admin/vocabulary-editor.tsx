"use client";

import { useState } from "react";
import type { VocabularyEntry } from "@/types/bloodwork";

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; entry: VocabularyEntry }
  | { kind: "adding" };

export function VocabularyEditor({
  entries,
  onRefresh,
}: {
  entries: VocabularyEntry[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<EditingState>({ kind: "none" });
  const [form, setForm] = useState({
    key: "",
    label: "",
    unit: "",
    min: "",
    max: "",
  });

  function startAdd() {
    setForm({ key: "", label: "", unit: "", min: "", max: "" });
    setEditing({ kind: "adding" });
  }

  function startEdit(entry: VocabularyEntry) {
    setForm({
      key: entry.key,
      label: entry.label,
      unit: entry.unit,
      min: String(entry.referenceRange.min),
      max: String(entry.referenceRange.max),
    });
    setEditing({ kind: "editing", entry });
  }

  async function handleSave() {
    const entry: VocabularyEntry = {
      key: form.key,
      label: form.label,
      unit: form.unit,
      referenceRange: { min: Number(form.min), max: Number(form.max) },
    };
    const method = editing.kind === "adding" ? "POST" : "PUT";
    await fetch("/api/vocabulary", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry }),
    });
    setEditing({ kind: "none" });
    onRefresh();
  }

  async function handleDelete(key: string) {
    await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    onRefresh();
  }

  return (
    <div>
      <table className="mb-4 w-full text-[11px]">
        <thead>
          <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
            <td className="pb-2">Key</td>
            <td className="pb-2">Label</td>
            <td className="pb-2">Unit</td>
            <td className="pb-2">Range</td>
            <td className="pb-2"></td>
          </tr>
        </thead>
        <tbody className="text-zinc-900">
          {entries.map((e) => (
            <tr key={e.key} className="border-t border-zinc-100">
              <td className="py-1.5 text-zinc-500">{e.key}</td>
              <td className="py-1.5">{e.label}</td>
              <td className="py-1.5 text-zinc-500">{e.unit}</td>
              <td className="py-1.5 text-zinc-500">
                {e.referenceRange.min}–{e.referenceRange.max}
              </td>
              <td className="space-x-2 py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => startEdit(e)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(e.key)}
                  className="text-zinc-400 hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing.kind !== "none" && (
        <div className="mb-4 flex flex-wrap gap-2 border border-zinc-200 p-3 text-[11px]">
          <input
            placeholder="key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            disabled={editing.kind === "editing"}
            className="w-24 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="w-20 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="min"
            value={form.min}
            onChange={(e) => setForm({ ...form, min: e.target.value })}
            className="w-16 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="max"
            value={form.max}
            onChange={(e) => setForm({ ...form, max: e.target.value })}
            className="w-16 border border-zinc-200 px-2 py-1 outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="border border-zinc-900 px-3 py-1 hover:bg-zinc-900 hover:text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing({ kind: "none" })}
            className="px-3 py-1 text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}

      {editing.kind === "none" && (
        <button
          type="button"
          onClick={startAdd}
          className="border border-zinc-200 px-4 py-1.5 text-[10px] text-zinc-500 hover:border-zinc-900 hover:text-zinc-900"
        >
          + Add Entry
        </button>
      )}
    </div>
  );
}
