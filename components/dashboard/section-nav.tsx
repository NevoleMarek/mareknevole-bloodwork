const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "health", label: "Health" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;

export function SectionNav() {
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
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex min-h-11 items-center rounded-xl px-2 text-[0.68rem] font-semibold whitespace-nowrap text-zinc-500 hover:text-zinc-900 sm:px-3 sm:text-[0.72rem]"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
