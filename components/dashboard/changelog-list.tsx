"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ChangelogCursor,
  ChangelogPage,
  SupplementChangelog,
} from "@/types/bloodwork";

type MoreState = { kind: "idle" } | { kind: "loading" } | { kind: "error" };

type ChangelogState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | {
      kind: "ready";
      entries: SupplementChangelog[];
      nextCursor: ChangelogCursor | null;
      more: MoreState;
    };

function pageUrl(cursor: ChangelogCursor | null) {
  if (!cursor) return "/api/public/changelog";
  const params = new URLSearchParams({
    date: cursor.date,
    createdAt: cursor.createdAt,
    id: cursor.id,
  });
  return `/api/public/changelog?${params}`;
}

async function fetchPage(cursor: ChangelogCursor | null) {
  const response = await fetch(pageUrl(cursor));
  if (!response.ok) throw new Error("Changelog request failed");
  return (await response.json()) as ChangelogPage;
}

export function ChangelogList() {
  const [state, setState] = useState<ChangelogState>({ kind: "idle" });
  const section = useRef<HTMLDivElement>(null);
  const firstRequest = useRef<Promise<ChangelogPage> | null>(null);
  const pageRequests = useRef(new Map<string, Promise<ChangelogPage>>());
  const loadingMore = useRef(false);

  const loadFirstPage = useCallback(() => {
    if (firstRequest.current) return;
    setState({ kind: "loading" });
    const request = fetchPage(null);
    firstRequest.current = request;
    request
      .then((page) =>
        setState({
          kind: "ready",
          entries: page.entries,
          nextCursor: page.nextCursor,
          more: { kind: "idle" },
        }),
      )
      .catch(() => {
        firstRequest.current = null;
        setState({ kind: "error" });
      });
  }, []);

  useEffect(() => {
    const target = section.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        loadFirstPage();
        observer.disconnect();
      },
      { rootMargin: "1000px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadFirstPage]);

  function requestPage(cursor: ChangelogCursor) {
    const key = pageUrl(cursor);
    const cached = pageRequests.current.get(key);
    if (cached) return cached;

    const request = fetchPage(cursor);
    pageRequests.current.set(key, request);
    void request.catch(() => pageRequests.current.delete(key));
    return request;
  }

  function prefetchMore() {
    if (state.kind !== "ready" || !state.nextCursor) return;
    void requestPage(state.nextCursor).catch(() => undefined);
  }

  function loadMore() {
    if (state.kind !== "ready" || !state.nextCursor || loadingMore.current)
      return;

    const cursor = state.nextCursor;
    const key = pageUrl(cursor);
    loadingMore.current = true;
    setState({ ...state, more: { kind: "loading" } });
    requestPage(cursor)
      .then((page) =>
        setState((current) => {
          if (
            current.kind !== "ready" ||
            !current.nextCursor ||
            pageUrl(current.nextCursor) !== key
          ) {
            return current;
          }
          return {
            kind: "ready",
            entries: [...current.entries, ...page.entries],
            nextCursor: page.nextCursor,
            more: { kind: "idle" },
          };
        }),
      )
      .catch(() =>
        setState((current) =>
          current.kind === "ready"
            ? { ...current, more: { kind: "error" } }
            : current,
        ),
      )
      .finally(() => {
        pageRequests.current.delete(key);
        loadingMore.current = false;
      });
  }

  return (
    <div ref={section}>
      {state.kind === "ready" ? (
        <>
          <div className="space-y-1">
            {state.entries.map((entry, index) => {
              const showDate =
                index === 0 || state.entries[index - 1].date !== entry.date;
              return (
                <div
                  key={entry.id}
                  data-testid="changelog-entry"
                  className="grid grid-cols-[5.5rem_0.75rem_1fr] items-start gap-2 py-1.5 text-sm"
                >
                  <span
                    data-testid="changelog-date"
                    className="data-value pt-px text-xs whitespace-nowrap text-zinc-500"
                  >
                    {showDate ? entry.date : ""}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-emerald-600"
                  />
                  <span className="text-zinc-700">{entry.description}</span>
                </div>
              );
            })}
          </div>
          {state.entries.length === 0 && (
            <p className="text-sm text-zinc-500">No changelog entries yet.</p>
          )}
          {state.nextCursor && (
            <button
              type="button"
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") prefetchMore();
              }}
              onClick={loadMore}
              disabled={state.more.kind === "loading"}
              className="button-secondary mt-4"
            >
              {state.more.kind === "loading"
                ? "Loading…"
                : state.more.kind === "error"
                  ? "Retry"
                  : "Load more"}
            </button>
          )}
        </>
      ) : state.kind === "error" ? (
        <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-sm text-zinc-600">
          <p>Could not load the changelog.</p>
          <button
            type="button"
            className="button-secondary"
            onClick={loadFirstPage}
          >
            Retry
          </button>
        </div>
      ) : (
        <p
          className="flex min-h-28 items-center justify-center text-sm text-zinc-500"
          role="status"
        >
          {state.kind === "loading"
            ? "Loading changelog…"
            : "Changelog loads as you approach this section."}
        </p>
      )}
    </div>
  );
}
