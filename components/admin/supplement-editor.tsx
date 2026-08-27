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
      expectedVersion: number;
    }
  | { kind: "removing"; changelogDate: string; expectedVersion: number };

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
          expectedVersion: state.expectedVersion,
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
        query: {
          changelogDate: state.changelogDate,
          expectedVersion: state.expectedVersion,
        },
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
                      <div className="admin-state-panel grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          value={state.name}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              name: e.target.value,
                            })
                          }
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
                          aria-label="Supplement start month"
                          className="field w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(s.id)}
                          className="button-primary"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowState(s.id, { kind: "display" })}
                          className="button-secondary"
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
                            className="field text-xs"
                          />
                        </span>
                        <span className="ml-auto flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
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
                            expectedVersion: s.version ?? 1,
                          })
                        }
                        className="button-quiet min-h-9 px-2 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRowState(s.id, {
                            kind: "removing",
                            changelogDate: today(),
                            expectedVersion: s.version ?? 1,
                          })
                        }
                        className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700"
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
              className="field w-full sm:max-w-xs"
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="button-primary mt-1 sm:col-span-2 sm:w-fit"
          >
            Add supplement
          </button>
        </div>
      </div>
    </div>
  );
}
