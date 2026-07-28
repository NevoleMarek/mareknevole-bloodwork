"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "health", label: "Health" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SectionNav() {
  const [active, setActive] = useState<SectionId>("metrics");

  useEffect(() => {
    function onScroll() {
      const offset = 140;
      let current: SectionId = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = id;
        }
      }
      setActive(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top, behavior: "auto" });
  }

  return (
    <div className="sticky top-3 z-50 mt-4">
      <nav
        aria-label="Dashboard sections"
        className="flex min-h-14 items-center gap-4 rounded-[1.15rem] border border-white/75 bg-white/78 px-1 shadow-[0_10px_30px_rgba(23,35,31,0.08)] backdrop-blur-xl sm:px-3"
      >
        <a
          href="#"
          className="hidden shrink-0 rounded-xl px-2 py-1.5 md:block"
          aria-label="Back to the top"
        >
          <span className="block text-xs font-semibold tracking-[-0.01em] text-zinc-900">
            Bloodwork
          </span>
          <span className="block text-[0.62rem] font-medium tracking-[0.08em] text-zinc-500 uppercase">
            Health record
          </span>
        </a>
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleClick(id)}
                aria-current={active === id ? "location" : undefined}
                className={`relative min-h-11 rounded-xl px-2 text-[0.68rem] font-semibold whitespace-nowrap sm:px-3 sm:text-[0.72rem] ${
                  active === id
                    ? "text-emerald-800"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {label}
                <span
                  aria-hidden="true"
                  data-active={active === id}
                  className={`section-nav-indicator absolute right-2 bottom-1.5 left-2 h-0.5 origin-left rounded-full bg-emerald-700 sm:right-3 sm:left-3 ${
                    active === id ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
