"use client";

import { useState } from "react";

import { runApi } from "@/lib/effect/client";
import { makeVocabularyKey } from "@/lib/effect/api";
import type { VocabularyEntry } from "@/types/bloodwork";

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; entry: VocabularyEntry }
  | { kind: "adding" };

const updatePayload = (entry: VocabularyEntry) => ({
  label: entry.label,
  unit: entry.unit,
  referenceRange: entry.referenceRange,
  description: entry.description,
  featured: entry.featured,
  visible: entry.visible,
});

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

  async function toggleVisible(entry: VocabularyEntry) {
    await runApi((client) =>
      client.vocabulary.update({
        params: { key: makeVocabularyKey(entry.key) },
        payload: updatePayload({ ...entry, visible: !entry.visible }),
      }),
    );
    onRefresh();
  }

  async function toggleFeatured(entry: VocabularyEntry) {
    await runApi((client) =>
      client.vocabulary.update({
        params: { key: makeVocabularyKey(entry.key) },
        payload: updatePayload({ ...entry, featured: !entry.featured }),
      }),
    );
    onRefresh();
  }

  async function handleSave() {
    const entry: VocabularyEntry = {
      key: form.key,
      label: form.label,
      unit: form.unit,
      referenceRange: { min: Number(form.min), max: Number(form.max) },
      description:
        editing.kind === "editing" ? editing.entry.description : null,
      featured: editing.kind === "editing" ? editing.entry.featured : false,
      visible: editing.kind === "editing" ? editing.entry.visible : true,
    };
    await runApi((client) =>
      editing.kind === "adding"
        ? client.vocabulary.create({ payload: entry })
        : client.vocabulary.update({
            params: { key: makeVocabularyKey(entry.key) },
            payload: updatePayload(entry),
          }),
    );
    setEditing({ kind: "none" });
    onRefresh();
  }

  async function handleDelete(key: string) {
    await runApi((client) =>
      client.vocabulary.delete({ params: { key: makeVocabularyKey(key) } }),
    );
    onRefresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave();
  }

  return (
    <div>
      <div className="admin-table-scroll mb-5 overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Biomarker vocabulary</caption>
          <thead>
            <tr className="text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
              <th scope="col" className="px-4 py-3 text-left">
                Key
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Label
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Unit
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Range
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Visible
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Featured
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {entries.map((e) => (
              <tr key={e.key} className="border-t border-zinc-900/8">
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-mono text-xs text-zinc-500"
                >
                  {e.key}
                </th>
                <td className="px-4 py-3 font-medium">{e.label}</td>
                <td className="px-4 py-3 text-zinc-600">{e.unit}</td>
                <td className="data-value px-4 py-3 text-zinc-600">
                  {e.referenceRange.min}–{e.referenceRange.max}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={e.visible}
                    onChange={() => toggleVisible(e)}
                    aria-label={`Show ${e.label} on dashboard`}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={e.featured}
                    onChange={() => toggleFeatured(e)}
                    aria-label={`Feature ${e.label}`}
                  />
                </td>
                <td className="space-x-1 px-4 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="button-quiet min-h-9 px-2 text-xs"
                    aria-label={`Edit ${e.label}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.key)}
                    className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700"
                    aria-label={`Delete ${e.label}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing.kind !== "none" && (
        <form
          aria-label={
            editing.kind === "adding"
              ? "Add biomarker vocabulary entry"
              : `Edit ${editing.entry.label} vocabulary entry`
          }
          onSubmit={handleSubmit}
          className="admin-state-panel mb-5 grid gap-3 rounded-2xl border border-zinc-900/10 bg-zinc-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <label htmlFor="vocabulary-key" className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Key
            </span>
            <input
              id="vocabulary-key"
              name="key"
              placeholder="key"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={editing.kind === "editing"}
              className="field w-full font-mono text-xs"
            />
          </label>
          <label htmlFor="vocabulary-label" className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Label
            </span>
            <input
              id="vocabulary-label"
              name="label"
              placeholder="label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="field w-full"
            />
          </label>
          <label htmlFor="vocabulary-unit" className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Unit
            </span>
            <input
              id="vocabulary-unit"
              name="unit"
              placeholder="unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="field w-full"
            />
          </label>
          <label htmlFor="vocabulary-min" className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Reference minimum
            </span>
            <input
              id="vocabulary-min"
              name="min"
              type="number"
              step="any"
              placeholder="min"
              value={form.min}
              onChange={(e) => setForm({ ...form, min: e.target.value })}
              className="field w-full"
            />
          </label>
          <label htmlFor="vocabulary-max" className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Reference maximum
            </span>
            <input
              id="vocabulary-max"
              name="max"
              type="number"
              step="any"
              placeholder="max"
              value={form.max}
              onChange={(e) => setForm({ ...form, max: e.target.value })}
              className="field w-full"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="button-primary">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing({ kind: "none" })}
              className="button-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editing.kind === "none" && (
        <button type="button" onClick={startAdd} className="button-primary">
          + Add entry
        </button>
      )}
    </div>
  );
}
