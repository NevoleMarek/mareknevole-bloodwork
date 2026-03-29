"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "trends", label: "Trends" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SectionNav() {
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<SectionId>("metrics");
  const [navHeight, setNavHeight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const measureNav = useCallback(() => {
    if (navRef.current) setNavHeight(navRef.current.offsetHeight);
  }, []);

  useEffect(() => {
    measureNav();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [measureNav]);

  useEffect(() => {
    function onScroll() {
      const offset = 80;
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div
      ref={wrapperRef}
      className="mt-6"
      style={{ height: stuck ? navHeight : "auto" }}
    >
      <nav
        ref={navRef}
        className={`flex items-center py-3 transition-[padding] duration-500 ${
          stuck
            ? "fixed top-0 right-0 left-0 z-50 border-b border-zinc-200 bg-stone-50 px-4 md:px-6"
            : ""
        }`}
      >
        <div className={`mx-auto flex w-full max-w-[960px] items-center`}>
          <div
            className="overflow-hidden transition-all duration-500"
            style={{
              width: stuck ? 120 : 0,
              opacity: stuck ? 1 : 0,
              marginRight: stuck ? 24 : 0,
              transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          >
            <div className="text-sm font-bold tracking-tight whitespace-nowrap">
              BLOODWORK
            </div>
            <div className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              Marek Nevole
            </div>
          </div>
          <div className="flex gap-4">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleClick(id)}
                className={`relative text-[10px] tracking-[2px] uppercase transition-colors duration-300 ${
                  active === id
                    ? "text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {label}
                <span
                  className={`absolute right-0 -bottom-0.5 left-0 h-px bg-zinc-900 transition-transform duration-300 ${
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
