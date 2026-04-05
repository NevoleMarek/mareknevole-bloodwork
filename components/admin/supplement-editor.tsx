"use client";

import { useState } from "react";
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

    await fetch("/api/supplements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: state.name,
        dose: state.dose,
        frequency: state.frequency,
        startedAt: state.startedAt,
        changelogDate: state.changelogDate,
      }),
    });
    setRowState(id, { kind: "display" });
    onRefresh();
  }

  async function handleRemove(id: string) {
    const state = getRowState(id);
    if (state.kind !== "removing") return;

    await fetch("/api/supplements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changelogDate: state.changelogDate }),
    });
    onRefresh();
  }

  async function handleAdd() {
    await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
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
      <div className="overflow-x-auto">
        <table className="mb-2 w-full text-[11px]">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
              <td className="pb-2"></td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => {
              const state = getRowState(s.id);

              if (state.kind === "editing") {
                return (
                  <tr
                    key={s.id}
                    className="border-t border-zinc-100 bg-stone-50"
                  >
                    <td colSpan={5} className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={state.name}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              name: e.target.value,
                            })
                          }
                          className="flex-1 border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <input
                          value={state.dose}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              dose: e.target.value,
                            })
                          }
                          className="w-24 border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <input
                          value={state.frequency}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              frequency: e.target.value,
                            })
                          }
                          className="w-24 border border-zinc-200 bg-white px-2 py-1 outline-none"
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
                          className="border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(s.id)}
                          className="border border-zinc-900 px-3 py-1 hover:bg-zinc-900 hover:text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowState(s.id, { kind: "display" })}
                          className="px-3 py-1 text-zinc-400"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>Changelog date:</span>
                        <input
                          type="date"
                          value={state.changelogDate}
                          onChange={(e) =>
                            setRowState(s.id, {
                              ...state,
                              changelogDate: e.target.value,
                            })
                          }
                          className="border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] outline-none"
                        />
                      </div>
                    </td>
                  </tr>
                );
              }

              if (state.kind === "removing") {
                return (
                  <tr key={s.id} className="border-t border-zinc-100 bg-red-50">
                    <td colSpan={5} className="py-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Remove <strong>{s.name}</strong>?
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span>Date:</span>
                          <input
                            type="date"
                            value={state.changelogDate}
                            onChange={(e) =>
                              setRowState(s.id, {
                                ...state,
                                changelogDate: e.target.value,
                              })
                            }
                            className="border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] outline-none"
                          />
                        </span>
                        <span className="ml-auto flex gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
                            className="border border-red-400 px-3 py-0.5 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRowState(s.id, { kind: "display" })
                            }
                            className="text-zinc-400"
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
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="py-1.5">{s.name}</td>
                  <td className="py-1.5 text-zinc-500">{s.dose}</td>
                  <td className="py-1.5 text-zinc-500">{s.frequency}</td>
                  <td className="py-1.5 text-zinc-400">
                    {formatMonth(s.startedAt)}
                  </td>
                  <td className="py-1.5 text-right">
                    <span className="flex justify-end gap-3">
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
                        className="text-zinc-400 hover:text-zinc-900"
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
                        className="text-zinc-400 hover:text-red-400"
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
      <div className="border border-zinc-200 p-4">
        <div className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Add Supplement
        </div>
        <div className="flex flex-col gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Creatine"
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Dose</span>
            <input
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              placeholder="e.g. 5g"
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">
              Frequency
            </span>
            <input
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Since</span>
            <input
              type="month"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">
              Changelog date
            </span>
            <input
              type="date"
              value={form.changelogDate}
              onChange={(e) =>
                setForm({ ...form, changelogDate: e.target.value })
              }
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-[90px]"></span>
            <button
              type="button"
              onClick={handleAdd}
              className="border border-zinc-900 px-4 py-1 text-[10px] hover:bg-zinc-900 hover:text-white"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
