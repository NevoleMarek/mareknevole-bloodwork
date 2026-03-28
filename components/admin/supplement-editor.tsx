"use client";

import { useState } from "react";
import type { Supplement } from "@/types/bloodwork";

export function SupplementEditor({
  supplements,
  onRefresh,
}: {
  supplements: Supplement[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dose: "",
    frequency: "daily",
    startedAt: "",
  });

  async function handleAdd() {
    await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAdding(false);
    setForm({ name: "", dose: "", frequency: "daily", startedAt: "" });
    onRefresh();
  }

  async function handleRemove(id: string) {
    await fetch("/api/supplements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  }

  return (
    <div>
      <table className="mb-4 w-full text-[11px]">
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
          {supplements.map((s) => (
            <tr key={s.id} className="border-t border-zinc-100">
              <td className="py-1.5">{s.name}</td>
              <td className="py-1.5 text-zinc-500">{s.dose}</td>
              <td className="py-1.5 text-zinc-500">{s.frequency}</td>
              <td className="py-1.5 text-zinc-400">{s.startedAt}</td>
              <td className="py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  className="text-zinc-400 hover:text-red-400"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {adding && (
        <div className="mb-4 flex gap-2 border border-zinc-200 p-3 text-[11px]">
          <input
            placeholder="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="dose"
            value={form.dose}
            onChange={(e) => setForm({ ...form, dose: e.target.value })}
            className="w-24 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="frequency"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            className="w-24 border border-zinc-200 px-2 py-1 outline-none"
          />
          <input
            placeholder="since (e.g. Jan 2025)"
            value={form.startedAt}
            onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            className="w-32 border border-zinc-200 px-2 py-1 outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="border border-zinc-900 px-3 py-1 hover:bg-zinc-900 hover:text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-3 py-1 text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border border-zinc-200 px-4 py-1.5 text-[10px] text-zinc-500 hover:border-zinc-900 hover:text-zinc-900"
        >
          + Add Supplement
        </button>
      )}
    </div>
  );
}
