"use client";

import { useId } from "react";
import { useState } from "react";

export function Accordion({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div>{summary}</div>
        <span aria-hidden="true" className="text-xs text-zinc-500">
          {open ? "▴" : "▾"}
        </span>
      </button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
