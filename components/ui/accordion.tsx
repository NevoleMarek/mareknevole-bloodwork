"use client";

import { useState } from "react";

export function Accordion({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3.5 px-4"
      >
        <div>{summary}</div>
        <span className="text-xs text-zinc-400">{open ? "▴" : "▾"}</span>
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
