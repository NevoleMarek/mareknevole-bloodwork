"use client";

import { useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { runApi } from "@/lib/effect/client";
import { makeVocabularyKey } from "@/lib/effect/api";
import type { VocabularyEntry } from "@/types/bloodwork";

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; entry: VocabularyEntry }
  | { kind: "adding" };

type VocabularyAction =
  | { kind: "toggle-visible"; entry: VocabularyEntry }
  | { kind: "toggle-featured"; entry: VocabularyEntry }
  | { kind: "save"; entry: VocabularyEntry; mode: "adding" | "editing" }
  | { kind: "delete"; key: string };

type MutationState =
  | { kind: "idle" }
  | { kind: "pending"; action: VocabularyAction }
  | { kind: "error"; action: VocabularyAction; message: string };

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
  onRefresh: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<EditingState>({ kind: "none" });
  const [mutation, setMutation] = useState<MutationState>({ kind: "idle" });
  const [form, setForm] = useState({
    key: "",
    label: "",
    unit: "",
    min: "",
    max: "",
  });
  const mutationPending = useRef(false);

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

  const isPending = mutation.kind === "pending";

  async function runMutation(action: VocabularyAction) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setMutation({ kind: "pending", action });

    try {
      if (action.kind === "toggle-visible") {
        await runApi((client) =>
          client.vocabulary.update({
            params: { key: makeVocabularyKey(action.entry.key) },
            payload: updatePayload({
              ...action.entry,
              visible: !action.entry.visible,
            }),
          }),
        );
      } else if (action.kind === "toggle-featured") {
        await runApi((client) =>
          client.vocabulary.update({
            params: { key: makeVocabularyKey(action.entry.key) },
            payload: updatePayload({
              ...action.entry,
              featured: !action.entry.featured,
            }),
          }),
        );
      } else if (action.kind === "save") {
        await runApi((client) =>
          action.mode === "adding"
            ? client.vocabulary.create({ payload: action.entry })
            : client.vocabulary.update({
                params: { key: makeVocabularyKey(action.entry.key) },
                payload: updatePayload(action.entry),
              }),
        );
        setEditing({ kind: "none" });
      } else {
        await runApi((client) =>
          client.vocabulary.delete({
            params: { key: makeVocabularyKey(action.key) },
          }),
        );
      }

      await onRefresh();
      setMutation({ kind: "idle" });
    } catch (error) {
      setMutation({
        kind: "error",
        action,
        message: adminErrorMessage(
          error,
          action.kind === "delete"
            ? "Could not delete this vocabulary entry. Please try again."
            : action.kind === "save"
              ? "Could not save this vocabulary entry. Please try again."
              : "Could not update vocabulary visibility. Please try again.",
        ),
      });
    } finally {
      mutationPending.current = false;
    }
  }

  function toggleVisible(entry: VocabularyEntry) {
    void runMutation({ kind: "toggle-visible", entry });
  }

  function toggleFeatured(entry: VocabularyEntry) {
    void runMutation({ kind: "toggle-featured", entry });
  }

  function handleSave() {
    if (editing.kind === "none") return;
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
    void runMutation({
      kind: "save",
      entry,
      mode: editing.kind,
    });
  }

  function handleDelete(key: string) {
    void runMutation({ kind: "delete", key });
  }

  function retryMutation() {
    if (mutation.kind !== "error") return;
    void runMutation(mutation.action);
  }

  return (
    <div aria-busy={isPending}>
      {mutation.kind === "error" && (
        <AdminErrorState message={mutation.message} onRetry={retryMutation} />
      )}
      {mutation.kind === "pending" && (
        <p
          role="status"
          aria-live="polite"
          className="mb-3 text-sm text-zinc-500"
        >
          {mutation.action.kind === "delete"
            ? "Deleting vocabulary entry…"
            : mutation.action.kind === "save"
              ? "Saving vocabulary entry…"
              : "Updating vocabulary visibility…"}
        </p>
      )}
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
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {e.key}
                </td>
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
                    disabled={isPending}
                    aria-label={`Show ${e.label} on dashboard`}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={e.featured}
                    onChange={() => toggleFeatured(e)}
                    disabled={isPending}
                    aria-label={`Feature ${e.label}`}
                  />
                </td>
                <td className="space-x-1 px-4 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    disabled={isPending}
                    className="button-quiet min-h-9 px-2 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.key)}
                    disabled={isPending}
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
        <div className="admin-state-panel mb-5 grid gap-3 rounded-2xl border border-zinc-900/10 bg-zinc-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <input
            placeholder="key"
            aria-label="Vocabulary key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            disabled={editing.kind === "editing" || isPending}
            className="field w-full font-mono text-xs"
          />
          <input
            placeholder="label"
            aria-label="Biomarker label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            disabled={isPending}
            className="field w-full"
          />
          <input
            placeholder="unit"
            aria-label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            disabled={isPending}
            className="field w-full"
          />
          <input
            placeholder="min"
            aria-label="Reference minimum"
            value={form.min}
            onChange={(e) => setForm({ ...form, min: e.target.value })}
            disabled={isPending}
            className="field w-full"
          />
          <input
            placeholder="max"
            aria-label="Reference maximum"
            value={form.max}
            onChange={(e) => setForm({ ...form, max: e.target.value })}
            disabled={isPending}
            className="field w-full"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="button-primary"
            >
              {isPending && mutation.action.kind === "save"
                ? "Saving…"
                : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing({ kind: "none" })}
              disabled={isPending}
              className="button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing.kind === "none" && (
        <button
          type="button"
          onClick={startAdd}
          disabled={isPending}
          className="button-primary"
        >
          + Add entry
        </button>
      )}
    </div>
  );
}
