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
      <div className="space-y-1">
        {visible.map((entry, i) => {
          const showDate = i === 0 || visible[i - 1].date !== entry.date;
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
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="button-secondary mt-4"
        >
          Load more
        </button>
      )}
    </div>
  );
}
