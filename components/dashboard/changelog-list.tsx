"use client";

import { useState } from "react";

import type { SupplementChangelog } from "@/types/bloodwork";

const PAGE_SIZE = 20;

export function ChangelogList({
  changelog,
}: {
  changelog: SupplementChangelog[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = changelog.slice(0, visibleCount);
  const hasMore = visibleCount < changelog.length;

  return (
    <div>
      <div className="space-y-1 text-[10px] text-zinc-500">
        {visible.map((entry, i) => {
          const showDate = i === 0 || visible[i - 1].date !== entry.date;
          return (
            <div
              key={entry.id}
              data-testid="changelog-entry"
              className="flex gap-3"
            >
              <span
                data-testid="changelog-date"
                className="w-[70px] shrink-0 whitespace-nowrap text-zinc-400"
              >
                {showDate ? entry.date : ""}
              </span>
              <span>{entry.description}</span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-3 border border-zinc-200 px-4 py-1.5 text-[10px] text-zinc-500 hover:border-zinc-900 hover:text-zinc-900"
        >
          Load more
        </button>
      )}
    </div>
  );
}
