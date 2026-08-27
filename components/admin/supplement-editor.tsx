"use client";

import { useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { makeSupplementId } from "@/lib/effect/api";
import { runApi } from "@/lib/effect/client";
import type { Supplement } from "@/types/bloodwork";

type SupplementForm = {
  name: string;
  dose: string;
  frequency: string;
  startedAt: string;
  changelogDate: string;
};

type RowState =
  | { kind: "display" }
  | ({ kind: "editing" } & SupplementForm)
  | { kind: "removing"; changelogDate: string };

type SupplementAction =
  | { kind: "save"; id: string; payload: SupplementForm }
  | { kind: "remove"; id: string; changelogDate: string }
  | { kind: "add"; payload: SupplementForm };

type MutationState =
  | { kind: "idle" }
  | { kind: "pending"; action: SupplementAction }
  | { kind: "error"; action: SupplementAction; message: string };

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyForm(): SupplementForm {
  return {
    name: "",
    dose: "",
    frequency: "daily",
    startedAt: "",
    changelogDate: today(),
  };
}

export function SupplementEditor({
  supplements,
  onRefresh,
}: {
  supplements: Supplement[];
  onRefresh: () => void | Promise<void>;
}) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [mutation, setMutation] = useState<MutationState>({ kind: "idle" });
  const [form, setForm] = useState<SupplementForm>(emptyForm);
  const mutationPending = useRef(false);

  function getRowState(id: string): RowState {
    return rowStates[id] ?? { kind: "display" };
  }

  function setRowState(id: string, state: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: state }));
  }

  const isPending = mutation.kind === "pending";

  async function runMutation(action: SupplementAction) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setMutation({ kind: "pending", action });

    try {
      if (action.kind === "save") {
        await runApi((client) =>
          client.supplements.update({
            params: { id: makeSupplementId(action.id) },
            payload: action.payload,
          }),
        );
        setRowState(action.id, { kind: "display" });
      } else if (action.kind === "remove") {
        await runApi((client) =>
          client.supplements.delete({
            params: { id: makeSupplementId(action.id) },
            query: { changelogDate: action.changelogDate },
          }),
        );
        setRowState(action.id, { kind: "display" });
      } else {
        await runApi((client) =>
          client.supplements.create({ payload: action.payload }),
        );
        setForm(emptyForm());
      }

      await onRefresh();
      setMutation({ kind: "idle" });
    } catch (error) {
      setMutation({
        kind: "error",
        action,
        message: adminErrorMessage(
          error,
          action.kind === "add"
            ? "Could not add this supplement. Please try again."
            : action.kind === "save"
              ? "Could not save this supplement. Please try again."
              : "Could not remove this supplement. Please try again.",
        ),
      });
    } finally {
      mutationPending.current = false;
    }
  }

  function handleSave(id: string) {
    const state = getRowState(id);
    if (state.kind !== "editing") return;
    void runMutation({
      kind: "save",
      id,
      payload: {
        name: state.name,
        dose: state.dose,
        frequency: state.frequency,
        startedAt: state.startedAt,
        changelogDate: state.changelogDate,
      },
    });
  }

  function handleRemove(id: string) {
    const state = getRowState(id);
    if (state.kind !== "removing") return;
    void runMutation({
      kind: "remove",
      id,
      changelogDate: state.changelogDate,
    });
  }

  function handleAdd() {
    void runMutation({ kind: "add", payload: { ...form } });
  }

  function retryMutation() {
    if (mutation.kind !== "error") return;
    void runMutation(mutation.action);
  }

  return (
    <div className="space-y-6" aria-busy={isPending}>
      {mutation.kind === "error" && (
        <AdminErrorState message={mutation.message} onRetry={retryMutation} />
      )}
      {mutation.kind === "pending" && (
        <p role="status" aria-live="polite" className="text-sm text-zinc-500">
          {mutation.action.kind === "add"
            ? "Adding supplement…"
            : mutation.action.kind === "save"
              ? "Saving supplement…"
              : "Removing supplement…"}
        </p>
      )}

      {/* Active supplements table */}
      <div className="admin-table-scroll overflow-x-auto rounded-2xl border border-zinc-900/10 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Active supplements</caption>
          <thead>
            <tr className="text-[0.68rem] font-semibold tracking-[0.07em] text-zinc-500 uppercase">
              <th scope="col" className="px-4 py-3 text-left">
                Supplement
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Dose
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Frequency
              </th>
              <th scope="col" className="px-4 py-3 text-left">
                Since
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => {
              const state = getRowState(s.id);

              if (state.kind === "editing") {
                return (
                  <tr
                    key={s.id}
                    className="border-t border-zinc-900/8 bg-emerald-50/45"
                  >
                    <td colSpan={5} className="p-4">
                      <div className="admin-state-panel grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          value={state.name}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              name: e.target.value,
                            })
                          }
                          disabled={isPending}
                          aria-label="Supplement name"
                          className="field w-full"
                        />
                        <input
                          value={state.dose}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              dose: e.target.value,
                            })
                          }
                          disabled={isPending}
                          aria-label="Supplement dose"
                          className="field w-full"
                        />
                        <input
                          value={state.frequency}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              frequency: e.target.value,
                            })
                          }
                          disabled={isPending}
                          aria-label="Supplement frequency"
                          className="field w-full"
                        />
                        <input
                          type="month"
                          value={state.startedAt}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              startedAt: e.target.value,
                            })
                          }
                          disabled={isPending}
                          aria-label="Supplement start month"
                          className="field w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(s.id)}
                          disabled={isPending}
                          className="button-primary disabled:opacity-40"
                        >
                          {mutation.kind === "pending" &&
                          mutation.action.kind === "save" &&
                          mutation.action.id === s.id
                            ? "Saving…"
                            : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowState(s.id, { kind: "display" })}
                          disabled={isPending}
                          className="button-secondary disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                        <label htmlFor={`edit-changelog-${s.id}`}>
                          Changelog date
                        </label>
                        <input
                          id={`edit-changelog-${s.id}`}
                          type="date"
                          value={state.changelogDate}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              changelogDate: e.target.value,
                            })
                          }
                          disabled={isPending}
                          className="field text-xs"
                        />
                      </div>
                    </td>
                  </tr>
                );
              }

              if (state.kind === "removing") {
                return (
                  <tr
                    key={s.id}
                    className="border-t border-zinc-900/8 bg-red-50"
                  >
                    <td colSpan={5} className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          Remove <strong>{s.name}</strong>?
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
                          <label htmlFor={`remove-date-${s.id}`}>Date</label>
                          <input
                            id={`remove-date-${s.id}`}
                            type="date"
                            value={state.changelogDate}
                            onChange={(e) =>
                              setRowState(s.id, {
                                ...state,
                                changelogDate: e.target.value,
                              })
                            }
                            disabled={isPending}
                            className="field text-xs"
                          />
                        </span>
                        <span className="ml-auto flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
                            disabled={isPending}
                            className="min-h-10 rounded-full bg-red-700 px-4 font-semibold text-white disabled:opacity-40"
                          >
                            {mutation.kind === "pending" &&
                            mutation.action.kind === "remove" &&
                            mutation.action.id === s.id
                              ? "Removing…"
                              : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRowState(s.id, { kind: "display" })
                            }
                            disabled={isPending}
                            className="button-secondary min-h-10 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={s.id} className="border-t border-zinc-900/8">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="data-value px-4 py-3 text-zinc-600">
                    {s.dose}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.frequency}</td>
                  <td className="data-value px-4 py-3 text-zinc-500">
                    {formatMonth(s.startedAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setRowState(s.id, {
                            kind: "editing",
                            name: s.name,
                            dose: s.dose,
                            frequency: s.frequency,
                            startedAt: s.startedAt,
                            changelogDate: today(),
                          })
                        }
                        disabled={isPending}
                        className="button-quiet min-h-9 px-2 text-xs disabled:opacity-40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRowState(s.id, {
                            kind: "removing",
                            changelogDate: today(),
                          })
                        }
                        disabled={isPending}
                        className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add supplement form */}
      <div className="admin-state-panel rounded-2xl border border-zinc-900/10 bg-zinc-50/70 p-4 sm:p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-800">
          Add supplement
        </h3>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Name
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isPending}
              placeholder="e.g. Creatine"
              className="field w-full"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Dose
            </span>
            <input
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              disabled={isPending}
              placeholder="e.g. 5g"
              className="field w-full"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Frequency
            </span>
            <input
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              disabled={isPending}
              className="field w-full"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Since
            </span>
            <input
              type="month"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
              disabled={isPending}
              className="field w-full"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Changelog date
            </span>
            <input
              type="date"
              value={form.changelogDate}
              onChange={(e) =>
                setForm({ ...form, changelogDate: e.target.value })
              }
              disabled={isPending}
              className="field w-full sm:max-w-xs"
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="button-primary mt-1 disabled:opacity-40 sm:col-span-2 sm:w-fit"
          >
            {mutation.kind === "pending" && mutation.action.kind === "add"
              ? "Adding…"
              : "Add supplement"}
          </button>
        </div>
      </div>
    </div>
  );
}
