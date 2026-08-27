"use client";

import { useState } from "react";

import { runApi } from "@/lib/effect/client";
import { makeSupplementId } from "@/lib/effect/api";
import type { Supplement } from "@/types/bloodwork";

type RowState =
  | { kind: "display" }
  | {
      kind: "editing";
      name: string;
      dose: string;
      frequency: string;
      startedAt: string;
      changelogDate: string;
    }
  | { kind: "removing"; changelogDate: string };

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function SupplementEditor({
  supplements,
  onRefresh,
}: {
  supplements: Supplement[];
  onRefresh: () => void;
}) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [form, setForm] = useState({
    name: "",
    dose: "",
    frequency: "daily",
    startedAt: "",
    changelogDate: today(),
  });

  function getRowState(id: string): RowState {
    return rowStates[id] ?? { kind: "display" };
  }

  function setRowState(id: string, state: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: state }));
  }

  async function handleSave(id: string) {
    const state = getRowState(id);
    if (state.kind !== "editing") return;

    await runApi((client) =>
      client.supplements.update({
        params: { id: makeSupplementId(id) },
        payload: {
          name: state.name,
          dose: state.dose,
          frequency: state.frequency,
          startedAt: state.startedAt,
          changelogDate: state.changelogDate,
        },
      }),
    );
    setRowState(id, { kind: "display" });
    onRefresh();
  }

  async function handleRemove(id: string) {
    const state = getRowState(id);
    if (state.kind !== "removing") return;

    await runApi((client) =>
      client.supplements.delete({
        params: { id: makeSupplementId(id) },
        query: { changelogDate: state.changelogDate },
      }),
    );
    onRefresh();
  }

  async function handleAdd() {
    await runApi((client) => client.supplements.create({ payload: form }));
    setForm({
      name: "",
      dose: "",
      frequency: "daily",
      startedAt: "",
      changelogDate: today(),
    });
    onRefresh();
  }

  return (
    <div className="space-y-6">
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
                      <form
                        aria-label={`Edit ${s.name}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleSave(s.id);
                        }}
                        className="admin-state-panel"
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label htmlFor={`edit-${s.id}-name`}>
                            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                              Name
                            </span>
                            <input
                              id={`edit-${s.id}-name`}
                              name="name"
                              value={state.name}
                              onChange={(e) =>
                                setRowState(s.id, {
                                  ...state,
                                  name: e.target.value,
                                })
                              }
                              className="field w-full"
                            />
                          </label>
                          <label htmlFor={`edit-${s.id}-dose`}>
                            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                              Dose
                            </span>
                            <input
                              id={`edit-${s.id}-dose`}
                              name="dose"
                              value={state.dose}
                              onChange={(e) =>
                                setRowState(s.id, {
                                  ...state,
                                  dose: e.target.value,
                                })
                              }
                              className="field w-full"
                            />
                          </label>
                          <label htmlFor={`edit-${s.id}-frequency`}>
                            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                              Frequency
                            </span>
                            <input
                              id={`edit-${s.id}-frequency`}
                              name="frequency"
                              value={state.frequency}
                              onChange={(e) =>
                                setRowState(s.id, {
                                  ...state,
                                  frequency: e.target.value,
                                })
                              }
                              className="field w-full"
                            />
                          </label>
                          <label htmlFor={`edit-${s.id}-started-at`}>
                            <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                              Since
                            </span>
                            <input
                              id={`edit-${s.id}-started-at`}
                              name="startedAt"
                              type="month"
                              value={state.startedAt}
                              onChange={(e) =>
                                setRowState(s.id, {
                                  ...state,
                                  startedAt: e.target.value,
                                })
                              }
                              className="field w-full"
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                          <label
                            htmlFor={`edit-changelog-${s.id}`}
                            className="flex flex-wrap items-center gap-2 text-xs text-zinc-600"
                          >
                            <span>Changelog date</span>
                            <input
                              id={`edit-changelog-${s.id}`}
                              name="changelogDate"
                              type="date"
                              value={state.changelogDate}
                              onChange={(e) =>
                                setRowState(s.id, {
                                  ...state,
                                  changelogDate: e.target.value,
                                })
                              }
                              className="field text-xs"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" className="button-primary">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRowState(s.id, { kind: "display" })
                              }
                              className="button-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
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
                      <form
                        aria-label={`Remove ${s.name}`}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleRemove(s.id);
                        }}
                        className="flex flex-wrap items-center gap-3"
                      >
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
                            className="field text-xs"
                          />
                        </span>
                        <span className="ml-auto flex gap-2 text-xs">
                          <button
                            type="submit"
                            className="min-h-10 rounded-full bg-red-700 px-4 font-semibold text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRowState(s.id, { kind: "display" })
                            }
                            className="button-secondary min-h-10"
                          >
                            Cancel
                          </button>
                        </span>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={s.id} className="border-t border-zinc-900/8">
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {s.name}
                  </th>
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
                        className="button-quiet min-h-9 px-2 text-xs"
                        aria-label={`Edit ${s.name}`}
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
                        className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700"
                        aria-label={`Remove ${s.name}`}
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
      <form
        aria-label="Add supplement"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
        className="admin-state-panel rounded-2xl border border-zinc-900/10 bg-zinc-50/70 p-4 sm:p-5"
      >
        <h3 className="mb-4 text-sm font-semibold text-zinc-800">
          Add supplement
        </h3>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <label htmlFor="add-supplement-name">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Name
            </span>
            <input
              id="add-supplement-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Creatine"
              className="field w-full"
            />
          </label>
          <label htmlFor="add-supplement-dose">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Dose
            </span>
            <input
              id="add-supplement-dose"
              name="dose"
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              placeholder="e.g. 5g"
              className="field w-full"
            />
          </label>
          <label htmlFor="add-supplement-frequency">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Frequency
            </span>
            <input
              id="add-supplement-frequency"
              name="frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="field w-full"
            />
          </label>
          <label htmlFor="add-supplement-started-at">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Since
            </span>
            <input
              id="add-supplement-started-at"
              name="startedAt"
              type="month"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
              className="field w-full"
            />
          </label>
          <label
            htmlFor="add-supplement-changelog-date"
            className="sm:col-span-2"
          >
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
              Changelog date
            </span>
            <input
              id="add-supplement-changelog-date"
              name="changelogDate"
              type="date"
              value={form.changelogDate}
              onChange={(e) =>
                setForm({ ...form, changelogDate: e.target.value })
              }
              className="field w-full sm:max-w-xs"
            />
          </label>
          <button
            type="submit"
            className="button-primary mt-1 sm:col-span-2 sm:w-fit"
          >
            Add supplement
          </button>
        </div>
      </form>
    </div>
  );
}
