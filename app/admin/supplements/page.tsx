"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SupplementEditor } from "@/components/admin/supplement-editor";
import type { Supplement, SupplementChangelog } from "@/types/bloodwork";

type SupplementsResponse = {
  supplements: Supplement[];
  changelog: SupplementChangelog[];
};

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; id: string; description: string };

async function loadData(): Promise<SupplementsResponse> {
  const res = await fetch("/api/supplements");
  return (await res.json()) as SupplementsResponse;
}

export default function AdminSupplementsPage() {
  const [data, setData] = useState<SupplementsResponse | null>(null);
  const [editing, setEditing] = useState<EditingState>({ kind: "none" });
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadData().then(setData);
  }, []);

  const refresh = useCallback(async () => {
    setData(await loadData());
  }, []);

  async function handleSaveEdit(id: string, description: string) {
    await fetch("/api/changelog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, description }),
    });
    setEditing({ kind: "none" });
    await refresh();
  }

  async function handleDelete(id: string) {
    await fetch("/api/changelog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  if (!data) return <p className="text-xs text-zinc-400">Loading...</p>;

  // Group changelog entries by date
  const groupedChangelog: { date: string; entries: SupplementChangelog[] }[] =
    [];
  for (const entry of data.changelog) {
    const last = groupedChangelog[groupedChangelog.length - 1];
    if (last && last.date === entry.date) {
      last.entries.push(entry);
    } else {
      groupedChangelog.push({ date: entry.date, entries: [entry] });
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Active Supplements
        </h2>
        <SupplementEditor supplements={data.supplements} onRefresh={refresh} />
      </section>

      {groupedChangelog.length > 0 && (
        <section>
          <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
            Changelog
          </h2>
          <div className="space-y-3 text-[10px]">
            {groupedChangelog.map((group) => (
              <div key={group.date}>
                <div className="mb-1 text-[9px] tracking-[1px] text-zinc-400">
                  {group.date}
                </div>
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-center gap-2 text-zinc-500"
                    >
                      {editing.kind === "editing" && editing.id === entry.id ? (
                        <form
                          className="flex flex-1 gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveEdit(entry.id, editing.description);
                          }}
                        >
                          <input
                            value={editing.description}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                description: e.target.value,
                              })
                            }
                            className="flex-1 border border-zinc-200 px-1.5 py-0.5 text-[10px] outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="text-[9px] text-zinc-500 hover:text-zinc-900"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ kind: "none" })}
                            className="text-[9px] text-zinc-400"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="flex-1">{entry.description}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                kind: "editing",
                                id: entry.id,
                                description: entry.description,
                              })
                            }
                            className="text-[9px] text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="text-[9px] text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
