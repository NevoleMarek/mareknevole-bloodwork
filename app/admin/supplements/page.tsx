"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AdminErrorState,
  adminErrorMessage,
} from "@/components/admin/admin-error-state";
import { SupplementEditor } from "@/components/admin/supplement-editor";
import { makeChangelogId, type SupplementsResponse } from "@/lib/effect/api";
import { runApi } from "@/lib/effect/client";
import type { SupplementChangelog } from "@/types/bloodwork";

type EditingState =
  | { kind: "none" }
  | { kind: "editing"; id: string; description: string };

type SupplementsData = SupplementsResponse & {
  changelog: SupplementChangelog[];
};

type ChangelogAction =
  | { kind: "save"; id: string; description: string }
  | { kind: "delete"; id: string };

type ChangelogMutation =
  | { kind: "idle" }
  | { kind: "pending"; action: ChangelogAction }
  | { kind: "error"; action: ChangelogAction; message: string };

async function loadData(): Promise<SupplementsData> {
  const [supplements, changelog] = await Promise.all([
    runApi((client) => client.supplements.list({})),
    runApi((client) => client.changelog.list({ query: {} })),
  ]);
  return { ...supplements, changelog: changelog.entries };
}

export default function AdminSupplementsPage() {
  const [data, setData] = useState<SupplementsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editing, setEditing] = useState<EditingState>({ kind: "none" });
  const [changelogMutation, setChangelogMutation] = useState<ChangelogMutation>(
    { kind: "idle" },
  );
  const didFetch = useRef(false);
  const refreshPending = useRef(false);
  const changelogPending = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    setIsRefreshing(true);
    setLoadError(null);
    try {
      setData(await loadData());
    } catch (error) {
      setLoadError(
        adminErrorMessage(
          error,
          "Could not load supplements. Please try again.",
        ),
      );
    } finally {
      refreshPending.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void refresh();
  }, [refresh]);

  async function runChangelogAction(action: ChangelogAction) {
    if (changelogPending.current) return;
    changelogPending.current = true;
    setChangelogMutation({ kind: "pending", action });
    try {
      if (action.kind === "save") {
        await runApi((client) =>
          client.changelog.update({
            params: { id: makeChangelogId(action.id) },
            payload: { description: action.description },
          }),
        );
        setEditing({ kind: "none" });
      } else {
        await runApi((client) =>
          client.changelog.delete({
            params: { id: makeChangelogId(action.id) },
          }),
        );
      }
      setChangelogMutation({ kind: "idle" });
      await refresh();
    } catch (error) {
      setChangelogMutation({
        kind: "error",
        action,
        message: adminErrorMessage(
          error,
          action.kind === "save"
            ? "Could not save this change. Please try again."
            : "Could not delete this change. Please try again.",
        ),
      });
    } finally {
      changelogPending.current = false;
    }
  }

  function handleSaveEdit(id: string, description: string) {
    void runChangelogAction({ kind: "save", id, description });
  }

  function handleDelete(id: string) {
    void runChangelogAction({ kind: "delete", id });
  }

  function retryChangelogAction() {
    if (changelogMutation.kind !== "error") return;
    void runChangelogAction(changelogMutation.action);
  }

  if (!data && loadError)
    return (
      <AdminErrorState
        message={loadError}
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );

  if (!data)
    return (
      <p role="status" aria-busy="true" className="text-sm text-zinc-500">
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
      {loadError && (
        <AdminErrorState
          message={loadError}
          onRetry={refresh}
          retrying={isRefreshing}
        />
      )}
      {changelogMutation.kind === "error" && (
        <AdminErrorState
          message={changelogMutation.message}
          onRetry={retryChangelogAction}
        />
      )}
      {changelogMutation.kind === "pending" && (
        <p role="status" aria-live="polite" className="text-sm text-zinc-500">
          {changelogMutation.action.kind === "save"
            ? "Saving change…"
            : "Deleting change…"}
        </p>
      )}
      <div className="space-y-5" aria-busy={isRefreshing}>
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
                          disabled={
                            changelogMutation.kind === "pending" &&
                            changelogMutation.action.kind === "save" &&
                            changelogMutation.action.id === entry.id
                          }
                          className="button-primary min-h-9 disabled:opacity-40"
                        >
                          {changelogMutation.kind === "pending" &&
                          changelogMutation.action.kind === "save" &&
                          changelogMutation.action.id === entry.id
                            ? "Saving…"
                            : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "none" })}
                          disabled={changelogMutation.kind === "pending"}
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
                          disabled={changelogMutation.kind === "pending"}
                          className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-700 disabled:opacity-40"
                          aria-label={`Delete change from ${entry.date}`}
                        >
                          {changelogMutation.kind === "pending" &&
                          changelogMutation.action.kind === "delete" &&
                          changelogMutation.action.id === entry.id
                            ? "Deleting…"
                            : "Delete"}
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
