# Dashboard Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public dashboard to separate supplements and changelog from the accordion, add a sticky section nav with smooth scroll-to and active section indicator, and paginate the changelog with "Load more."

**Architecture:** Replace the single `SupplementStack` accordion with three new components: `SectionNav` (sticky nav with scroll-spy), `SupplementTable` (always-visible table), and `ChangelogList` (paginated, grouped by day). The nav buttons sit inline in the header, become sticky on scroll, and animate a logo expansion when stuck.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, IntersectionObserver API

**Spec:** `docs/superpowers/specs/2026-03-30-dashboard-layout-design.md`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `components/dashboard/section-nav.tsx` | Sticky nav bar with scroll-spy and logo animation |
| `components/dashboard/supplement-table.tsx` | Always-visible supplements table |
| `components/dashboard/changelog-list.tsx` | Paginated changelog grouped by day |
| `components/dashboard/supplement-table.test.tsx` | Tests for supplement table |
| `components/dashboard/changelog-list.test.tsx` | Tests for changelog list |

### Modified files

| File | Change |
|---|---|
| `app/page.tsx` | New layout order, new components, section IDs |

### Deleted files

| File | Reason |
|---|---|
| `components/dashboard/supplement-stack.tsx` | Replaced by supplement-table + changelog-list |
| `components/dashboard/supplement-stack.test.tsx` | Tests for deleted component |

---

## Task 1: Supplement table component

**Files:**
- Create: `components/dashboard/supplement-table.tsx`
- Create: `components/dashboard/supplement-table.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/dashboard/supplement-table.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SupplementTable } from "@/components/dashboard/supplement-table";
import type { Supplement } from "@/types/bloodwork";

const supplements: Supplement[] = [
  {
    id: "s1",
    name: "Creatine",
    dose: "5 g",
    frequency: "daily",
    startedAt: "Jun 2025",
    stoppedAt: null,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "s2",
    name: "Vitamin D3",
    dose: "5000 IU",
    frequency: "daily",
    startedAt: "Jan 2025",
    stoppedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

describe("SupplementTable", () => {
  it("renders all supplements", () => {
    render(<SupplementTable supplements={supplements} />);
    expect(screen.getByText("Creatine")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D3")).toBeInTheDocument();
    expect(screen.getByText("5 g")).toBeInTheDocument();
    expect(screen.getByText("5000 IU")).toBeInTheDocument();
  });

  it("shows count in header", () => {
    render(<SupplementTable supplements={supplements} />);
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/supplement-table.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write supplement table component**

Create `components/dashboard/supplement-table.tsx`:

```tsx
import type { Supplement } from "@/types/bloodwork";

export function SupplementTable({
  supplements,
}: {
  supplements: Supplement[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Supplement Stack
        </span>
        <span className="text-[10px] text-zinc-500">
          {supplements.length} active
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100">
                <td className="py-1.5">{s.name}</td>
                <td className="py-1.5 text-zinc-500">{s.dose}</td>
                <td className="py-1.5 text-zinc-500">{s.frequency}</td>
                <td className="py-1.5 text-zinc-400">{s.startedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/supplement-table.test.tsx`
Expected: PASS

- [ ] **Step 5: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/supplement-table.tsx components/dashboard/supplement-table.test.tsx
git commit -m "feat: add supplement table component"
```

---

## Task 2: Changelog list component

**Files:**
- Create: `components/dashboard/changelog-list.tsx`
- Create: `components/dashboard/changelog-list.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/dashboard/changelog-list.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import type { SupplementChangelog } from "@/types/bloodwork";

function makeEntries(count: number): SupplementChangelog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    date: `2025-06-${String(15 - Math.floor(i / 3)).padStart(2, "0")}`,
    description: `Entry ${i}`,
    createdAt: "2025-06-01T00:00:00Z",
  }));
}

describe("ChangelogList", () => {
  it("groups entries by date, showing date only on first of each group", () => {
    const entries: SupplementChangelog[] = [
      { id: "c1", date: "2025-06-15", description: "Added Creatine", createdAt: "2025-06-15T00:00:00Z" },
      { id: "c2", date: "2025-06-15", description: "Changed Vitamin D", createdAt: "2025-06-15T00:00:00Z" },
      { id: "c3", date: "2025-06-10", description: "Added Fish Oil", createdAt: "2025-06-10T00:00:00Z" },
    ];
    render(<ChangelogList changelog={entries} />);
    const dates = screen.getAllByTestId("changelog-date");
    expect(dates[0]).toHaveTextContent("2025-06-15");
    expect(dates[1]).toHaveTextContent("");
    expect(dates[2]).toHaveTextContent("2025-06-10");
  });

  it("shows only 20 entries initially", () => {
    render(<ChangelogList changelog={makeEntries(25)} />);
    expect(screen.getAllByTestId("changelog-entry")).toHaveLength(20);
    expect(screen.getByText("Load more")).toBeInTheDocument();
  });

  it("loads more entries on button click", async () => {
    const user = userEvent.setup();
    render(<ChangelogList changelog={makeEntries(25)} />);
    await user.click(screen.getByText("Load more"));
    expect(screen.getAllByTestId("changelog-entry")).toHaveLength(25);
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });

  it("hides load more when all entries shown", () => {
    render(<ChangelogList changelog={makeEntries(10)} />);
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/changelog-list.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write changelog list component**

Create `components/dashboard/changelog-list.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/changelog-list.test.tsx`
Expected: PASS

- [ ] **Step 5: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/changelog-list.tsx components/dashboard/changelog-list.test.tsx
git commit -m "feat: add paginated changelog list component"
```

---

## Task 3: Section nav component

**Files:**
- Create: `components/dashboard/section-nav.tsx`

- [ ] **Step 1: Write section nav component**

Create `components/dashboard/section-nav.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "trends", label: "Trends" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;

export function SectionNav() {
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState("metrics");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onScroll() {
      const offset = 80;
      let current = SECTIONS[0].id;
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
    <div ref={wrapperRef} className="mt-6">
      <nav
        className={`flex items-center py-3 transition-[padding] duration-500 ${
          stuck
            ? "fixed top-0 right-0 left-0 z-50 border-b border-zinc-200 bg-stone-50 px-4 md:px-6"
            : ""
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-[960px] items-center`}
        >
          <div
            className="overflow-hidden transition-all duration-500"
            style={{
              width: stuck ? 120 : 0,
              opacity: stuck ? 1 : 0,
              marginRight: stuck ? 24 : 0,
              transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          >
            <div className="whitespace-nowrap text-sm font-bold tracking-tight">
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
                  active === id ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {label}
                <span
                  className={`absolute -bottom-0.5 left-0 right-0 h-px bg-zinc-900 transition-transform duration-300 ${
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
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/section-nav.tsx
git commit -m "feat: add sticky section nav with scroll-spy"
```

---

## Task 4: Rewire page and delete old components

**Files:**
- Modify: `app/page.tsx`
- Delete: `components/dashboard/supplement-stack.tsx`
- Delete: `components/dashboard/supplement-stack.test.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `app/page.tsx`:

```tsx
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ChangelogList } from "@/components/dashboard/changelog-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SectionNav } from "@/components/dashboard/section-nav";
import { SupplementTable } from "@/components/dashboard/supplement-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import {
  getActiveSupplements,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVocabulary,
} from "@/db/queries";
import type { Status } from "@/types/bloodwork";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const vocabulary = await getVocabulary(db);
  const readings = await getReadingsWithMeasurements(db);
  const supplements = await getActiveSupplements(db);
  const changelog = await getSupplementChangelog(db);

  const latest = readings.at(-1);
  const latestDate = latest
    ? new Date(latest.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const metrics = latest
    ? latest.measurements.map((m) => {
        const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
        if (!entry)
          throw new Error(`Unknown vocabulary key: ${m.vocabularyKey}`);
        return {
          label: entry.label,
          value: m.value,
          unit: m.unit,
          min: entry.referenceRange.min,
          max: entry.referenceRange.max,
          status: m.status as Status,
        };
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8">
      <header className="mb-8 border-b border-zinc-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight">BLOODWORK</h1>
        <p className="mt-1 text-[10px] tracking-widest text-zinc-400 uppercase">
          Marek Nevole
        </p>
        <div className="mt-8 columns-1 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500 md:columns-2">
          <p>
            This dashboard exists because better decisions come from better
            data, and better data starts with putting everything in one place,
            structured and accessible. When consistently collecting the data,
            the patterns become impossible to ignore. In an age where language
            models can reason over years of personal data, every month of
            structured collection is an investment that compounds into sharper,
            earlier, more informed decisions.
          </p>
          <p className="mt-4">
            It&apos;s public because the upside is shared. If seeing this
            inspires you to take your own measurements more seriously, or to
            build something like it, then openness costs nothing and creates
            something. We obsess over data collection in professional settings
            because it works. There&apos;s no reason not to apply that same
            discipline to the thing that matters most.
          </p>
        </div>
        <SectionNav />
      </header>

      <section id="metrics" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Metrics · {latestDate}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard
              key={m.label}
              label={m.label}
              value={m.value}
              unit={m.unit}
              min={m.min}
              max={m.max}
              status={m.status}
            />
          ))}
        </div>
      </section>

      <section id="trends" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Trends
        </h2>
        <TrendChart
          readings={readings.map((r) => ({
            date: r.date,
            source: r.source,
            measurements: r.measurements,
          }))}
          vocabulary={vocabulary}
        />
      </section>

      <section id="supplements" className="mb-8">
        <SupplementTable supplements={supplements} />
      </section>

      <section id="changelog" className="mb-8">
        <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Changelog
        </h2>
        <ChangelogList changelog={changelog} />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Delete old files**

```bash
rm components/dashboard/supplement-stack.tsx components/dashboard/supplement-stack.test.tsx
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS (supplement-stack tests removed, new component tests pass)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: redesign dashboard layout with sticky nav and separated sections"
```

---

## Task 5: Update specs

**Files:**
- Modify: `specs/architecture.md`

- [ ] **Step 1: Update architecture spec**

In `specs/architecture.md`, update the **Component Architecture** dashboard section:

```
- `components/dashboard/` — public dashboard components
  - `section-nav` — sticky nav bar with scroll-spy and logo animation
  - `metric-card` — single metric with value, unit, status, and range bar
  - `range-bar` — bounded zone visualization with value marker
  - `trend-chart` — sparkline trends over time
  - `supplement-table` — always-visible supplement list
  - `changelog-list` — paginated changelog grouped by day
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add specs/architecture.md
git commit -m "docs: update architecture spec for dashboard redesign"
```

---

## Task 6: Final validation

- [ ] **Step 1: Run full validation suite**

Run: `bun run check:full`
Expected: PASS

- [ ] **Step 2: Manual smoke test**

1. Run `bun dev`
2. Open `/` — verify header with intro text and inline nav buttons
3. Scroll down — verify sticky nav appears smoothly with logo animation
4. Click nav buttons — verify smooth scroll to sections
5. Scroll through sections — verify active section indicator updates
6. Verify supplements table always visible (no accordion)
7. Verify changelog shows first 20 entries with "Load more" button
8. Click "Load more" — verify next batch appends
9. Scroll back to top — verify sticky nav disappears and buttons return inline
