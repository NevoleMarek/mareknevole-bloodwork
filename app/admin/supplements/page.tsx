"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SupplementEditor } from "@/components/admin/supplement-editor";
import type { Supplement, SupplementChangelog } from "@/types/bloodwork";

type SupplementsResponse = {
  supplements: Supplement[];
  changelog: SupplementChangelog[];
};

async function loadData(): Promise<SupplementsResponse> {
  const res = await fetch("/api/supplements");
  return (await res.json()) as SupplementsResponse;
}

export default function AdminSupplementsPage() {
  const [data, setData] = useState<SupplementsResponse | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    loadData().then(setData);
  }, []);

  const refresh = useCallback(async () => {
    setData(await loadData());
  }, []);

  if (!data) return <p className="text-xs text-zinc-400">Loading...</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Active Supplements
        </h2>
        <SupplementEditor supplements={data.supplements} onRefresh={refresh} />
      </section>

      {data.changelog.length > 0 && (
        <section>
          <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
            Changelog
          </h2>
          <div className="space-y-1 text-[10px] text-zinc-500">
            {data.changelog.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <span className="whitespace-nowrap text-zinc-400">
                  {entry.date}
                </span>
                <span>{entry.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
