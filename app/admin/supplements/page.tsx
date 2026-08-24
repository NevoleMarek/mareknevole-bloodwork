"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SupplementEditor } from "@/components/admin/supplement-editor";
import { decodeResponseJson } from "@/lib/effect/client";
import {
  SupplementsResponse as SupplementsResponseSchema,
  type SupplementsResponse,
} from "@/lib/schemas/wire";
import type { SupplementChangelog } from "@/types/bloodwork";

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; id: string; description: string };

async function loadData(): Promise<SupplementsResponse> {
  const res = await fetch("/api/supplements");
  return decodeResponseJson(
    res,
    SupplementsResponseSchema,
    "admin.supplements",
  );
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

  if (!data)
    return (
      <p role="status" className="text-sm text-zinc-500">
        Loading supplements…
      </p>
    );

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
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Current protocol</p>
        <h1 className="mt-2">Supplements</h1>
        <p>Maintain the active stack and its public change history.</p>
      </div>
      <div className="space-y-5">
        <section className="admin-panel">
          <h2 className="mb-5 text-sm font-semibold text-zinc-800">
            Active supplements
          </h2>
          <SupplementEditor
            supplements={data.supplements}
            onRefresh={refresh}
          />
        </section>

        {groupedChangelog.length > 0 && (
          <section className="admin-panel">
            <h2 className="mb-5 text-sm font-semibold text-zinc-800">
              Changelog
            </h2>
            <div className="space-y-2 text-sm">
              {groupedChangelog.map((group) =>
                group.entries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-1.5 text-zinc-600"
                  >
                    <span className="data-value w-[90px] shrink-0 text-xs whitespace-nowrap text-zinc-500">
                      {i === 0 ? group.date : ""}
                    </span>
                    {editing.kind === "editing" && editing.id === entry.id ? (
                      <form
                        className="admin-state-panel flex min-w-[14rem] flex-1 flex-wrap gap-2"
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
                          aria-label="Changelog description"
                          className="field min-w-[12rem] flex-1 text-sm"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="button-primary min-h-9"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "none" })}
                          className="button-quiet min-h-9"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-[12rem] flex-1">
                          {entry.description}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              kind: "editing",
                              id: entry.id,
                              description: entry.description,
                            })
                          }
                          className="button-quiet min-h-9 px-2 text-xs"
                          aria-label={`Edit change from ${entry.date}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700"
                          aria-label={`Delete change from ${entry.date}`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )),
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
