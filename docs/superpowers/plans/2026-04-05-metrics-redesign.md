# Metrics Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Metrics grid and Trends chart with a unified metrics section: featured biomarker cards, a dense table for the rest, and a single stacked trend panel that opens when biomarkers are clicked.

**Architecture:** Add `featured` flag to vocabulary. Split the latest reading's measurements into featured (cards) and non-featured (table). A new client component `TrendPanel` handles selection state and renders stacked Recharts line charts with neutral reference range bands inside one bordered container. Remove the old `TrendChart` component and Trends section entirely.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Recharts, D1/SQLite, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-05-metrics-redesign-design.md`

---

### Task 1: Add `featured` column to data model and plumb through types/queries/API

**Files:**
- Modify: `db/schema.sql`
- Modify: `types/bloodwork.ts`
- Modify: `db/queries.ts`
- Modify: `app/api/vocabulary/route.ts`
- Modify: `components/admin/vocabulary-editor.tsx`

- [ ] **Step 1: Update schema**

Add `featured` column to `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS vocabulary (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL NOT NULL,
  reference_max REAL NOT NULL,
  description TEXT,
  featured INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Update VocabularyEntry type**

In `types/bloodwork.ts`, add `featured` to `VocabularyEntry`:

```typescript
export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
  featured: boolean;
};
```

- [ ] **Step 3: Update queries.ts**

Add `featured` to `VocabularyRow`:

```typescript
type VocabularyRow = {
  key: string;
  label: string;
  unit: string;
  reference_min: number;
  reference_max: number;
  description: string | null;
  featured: number;
};
```

Update `mapVocabularyRow`:

```typescript
export function mapVocabularyRow(row: VocabularyRow): VocabularyEntry {
  return {
    key: row.key,
    label: row.label,
    unit: row.unit,
    referenceRange: { min: row.reference_min, max: row.reference_max },
    description: row.description,
    featured: row.featured === 1,
  };
}
```

Update the `getVocabulary` query to include `featured`:

```typescript
export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const { results } = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max, description, featured FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  return results.map(mapVocabularyRow);
}
```

- [ ] **Step 4: Update vocabulary API route**

In `app/api/vocabulary/route.ts`, update POST to include `featured`:

```typescript
await db
  .prepare(
    "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
  .bind(
    entry.key,
    entry.label,
    entry.unit,
    entry.referenceRange.min,
    entry.referenceRange.max,
    entry.description,
    entry.featured ? 1 : 0,
  )
  .run();
```

Update PUT to include `featured`:

```typescript
const result = await db
  .prepare(
    "UPDATE vocabulary SET label = ?, unit = ?, reference_min = ?, reference_max = ?, description = ?, featured = ? WHERE key = ?",
  )
  .bind(
    entry.label,
    entry.unit,
    entry.referenceRange.min,
    entry.referenceRange.max,
    entry.description,
    entry.featured ? 1 : 0,
    entry.key,
  )
  .run();
```

- [ ] **Step 5: Add featured toggle to vocabulary editor**

In `components/admin/vocabulary-editor.tsx`, add a "Featured" column header and a checkbox per row that calls the existing PUT endpoint. When toggling featured, preserve all other fields from the entry:

```tsx
<td className="pb-2">Featured</td>
```

Per row:

```tsx
<td className="py-1.5">
  <input
    type="checkbox"
    checked={e.featured}
    onChange={() => toggleFeatured(e)}
  />
</td>
```

Add the toggle handler:

```typescript
async function toggleFeatured(entry: VocabularyEntry) {
  await fetch("/api/vocabulary", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: { ...entry, featured: !entry.featured },
    }),
  });
  onRefresh();
}
```

Also update `handleSave` to preserve `featured` for both adding and editing:

```typescript
async function handleSave() {
  const entry: VocabularyEntry = {
    key: form.key,
    label: form.label,
    unit: form.unit,
    referenceRange: { min: Number(form.min), max: Number(form.max) },
    description:
      editing.kind === "editing" ? editing.entry.description : null,
    featured:
      editing.kind === "editing" ? editing.entry.featured : false,
  };
  // ... rest unchanged
}
```

- [ ] **Step 6: Apply schema migration to remote D1**

Run:
```bash
bunx wrangler d1 execute bloodwork-db --remote --command="ALTER TABLE vocabulary ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;"
```

- [ ] **Step 7: Run check and commit**

Run: `bun run check`
Expected: all checks pass

```bash
git add db/schema.sql types/bloodwork.ts db/queries.ts app/api/vocabulary/route.ts components/admin/vocabulary-editor.tsx
git commit -m "feat: add featured flag to vocabulary"
```

---

### Task 2: Build the dense biomarker table component

**Files:**
- Create: `components/dashboard/biomarker-table.tsx`
- Create: `components/dashboard/biomarker-table.test.tsx`

- [ ] **Step 1: Write the test**

Create `components/dashboard/biomarker-table.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BiomarkerTable } from "@/components/dashboard/biomarker-table";

const metrics = [
  { vocabularyKey: "tsh", label: "TSH", value: 2.1, unit: "mIU/L", min: 0.4, max: 4.0, status: "normal" as const },
  { vocabularyKey: "vitd", label: "Vitamin D", value: 28, unit: "ng/mL", min: 30, max: 100, status: "low" as const },
];

describe("BiomarkerTable", () => {
  it("renders all biomarker rows", () => {
    render(<BiomarkerTable metrics={metrics} selected={[]} onToggle={() => {}} />);
    expect(screen.getByText("TSH")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D")).toBeInTheDocument();
    expect(screen.getByText("2.1")).toBeInTheDocument();
    expect(screen.getByText("0.4 – 4")).toBeInTheDocument();
  });

  it("highlights selected rows", () => {
    const { container } = render(
      <BiomarkerTable metrics={metrics} selected={["tsh"]} onToggle={() => {}} />,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0].className).toContain("bg-zinc-50");
    expect(rows[1].className).not.toContain("bg-zinc-50");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/biomarker-table.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BiomarkerTable**

Create `components/dashboard/biomarker-table.tsx`:

```tsx
import type { Status } from "@/types/bloodwork";

const statusColor: Record<Status, string> = {
  normal: "bg-green-400/60",
  borderline: "bg-amber-400/60",
  high: "bg-red-400/60",
  low: "bg-blue-400/60",
};

export type BiomarkerMetric = {
  vocabularyKey: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: Status;
};

export function BiomarkerTable({
  metrics,
  selected,
  onToggle,
}: {
  metrics: BiomarkerMetric[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-zinc-200 bg-white border-collapse">
        <thead>
          <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
            <th className="pb-2 pl-4 pt-2.5 text-left font-normal" />
            <th className="pb-2 pt-2.5 text-left font-normal">Biomarker</th>
            <th className="pb-2 pt-2.5 text-left font-normal">Value</th>
            <th className="pb-2 pt-2.5 text-left font-normal">Reference</th>
            <th className="pb-2 pr-4 pt-2.5 text-left font-normal">Unit</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr
              key={m.vocabularyKey}
              onClick={() => onToggle(m.vocabularyKey)}
              className={`cursor-pointer border-t border-zinc-100 transition-colors hover:bg-zinc-50 ${
                selected.includes(m.vocabularyKey) ? "bg-zinc-50" : ""
              }`}
            >
              <td className="py-2 pl-4">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor[m.status]}`}
                />
              </td>
              <td className="py-2 text-[13px] font-semibold">{m.label}</td>
              <td className="py-2 text-[13px] font-bold">{m.value}</td>
              <td className="py-2 text-[12px] text-zinc-500">
                {m.min} – {m.max}
              </td>
              <td className="py-2 pr-4 text-[12px] text-zinc-500">{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/biomarker-table.test.tsx`
Expected: PASS

- [ ] **Step 5: Run check and commit**

Run: `bun run check`

```bash
git add components/dashboard/biomarker-table.tsx components/dashboard/biomarker-table.test.tsx
git commit -m "feat: add dense biomarker table component"
```

---

### Task 3: Build the unified trend panel component

**Files:**
- Create: `components/dashboard/trend-panel.tsx`
- Create: `components/dashboard/trend-panel.test.tsx`

- [ ] **Step 1: Write the test**

Create `components/dashboard/trend-panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendPanel } from "@/components/dashboard/trend-panel";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

const vocabulary: VocabularyEntry[] = [
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 100 },
    description: "Fasting glucose measures blood sugar.",
    featured: false,
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    referenceRange: { min: 0, max: 130 },
    description: "Low-density lipoprotein.",
    featured: false,
  },
];

const readings: BloodworkReading[] = [
  {
    date: "2025-06-15",
    source: "test.pdf",
    measurements: [
      { vocabularyKey: "glucose", value: 92, unit: "mg/dL", status: "normal" },
      { vocabularyKey: "ldl", value: 118, unit: "mg/dL", status: "normal" },
    ],
  },
  {
    date: "2025-09-15",
    source: "test2.pdf",
    measurements: [
      { vocabularyKey: "glucose", value: 95, unit: "mg/dL", status: "normal" },
      { vocabularyKey: "ldl", value: 142, unit: "mg/dL", status: "high" },
    ],
  },
];

describe("TrendPanel", () => {
  it("renders nothing when no keys are selected", () => {
    const { container } = render(
      <TrendPanel selectedKeys={[]} readings={readings} vocabulary={vocabulary} onRemove={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header and description for selected biomarker", () => {
    render(
      <TrendPanel selectedKeys={["glucose"]} readings={readings} vocabulary={vocabulary} onRemove={() => {}} />,
    );
    expect(screen.getByText("Glucose")).toBeInTheDocument();
    expect(screen.getByText("70–100 mg/dL")).toBeInTheDocument();
    expect(screen.getByText(/Fasting glucose/)).toBeInTheDocument();
  });

  it("renders multiple selected biomarkers", () => {
    render(
      <TrendPanel selectedKeys={["glucose", "ldl"]} readings={readings} vocabulary={vocabulary} onRemove={() => {}} />,
    );
    expect(screen.getByText("Glucose")).toBeInTheDocument();
    expect(screen.getByText("LDL")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/trend-panel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TrendPanel**

Create `components/dashboard/trend-panel.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { BloodworkReading, VocabularyEntry } from "@/types/bloodwork";

function buildChartData(
  key: string,
  readings: BloodworkReading[],
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  for (const r of readings) {
    const m = r.measurements.find((m) => m.vocabularyKey === key);
    if (m) {
      points.push({
        date: new Date(r.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value: m.value,
      });
    }
  }
  return points;
}

function latestValue(
  key: string,
  readings: BloodworkReading[],
): number | null {
  for (let i = readings.length - 1; i >= 0; i--) {
    const m = readings[i].measurements.find((m) => m.vocabularyKey === key);
    if (m) return m.value;
  }
  return null;
}

function latestStatus(
  key: string,
  readings: BloodworkReading[],
): string | null {
  for (let i = readings.length - 1; i >= 0; i--) {
    const m = readings[i].measurements.find((m) => m.vocabularyKey === key);
    if (m) return m.status;
  }
  return null;
}

function BiomarkerTrend({
  entry,
  readings,
  onRemove,
}: {
  entry: VocabularyEntry;
  readings: BloodworkReading[];
  onRemove: () => void;
}) {
  const chartData = useMemo(
    () => buildChartData(entry.key, readings),
    [entry.key, readings],
  );
  const latest = latestValue(entry.key, readings);
  const status = latestStatus(entry.key, readings);
  const { min, max } = entry.referenceRange;

  const allValues = chartData.map((d) => d.value);
  const dataMin = Math.min(...allValues, min);
  const dataMax = Math.max(...allValues, max);
  const padding = (dataMax - dataMin) * 0.15 || 1;
  const yMin = dataMin - padding;
  const yMax = dataMax + padding;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-[11px]">
        <span className="min-w-[100px] text-[10px] font-bold tracking-[1px] uppercase">
          {entry.label}
        </span>
        <span className="text-zinc-500">
          {min}–{max} {entry.unit}
        </span>
        {latest !== null && (
          <span>
            Latest: <strong>{latest}</strong>
          </span>
        )}
        {status && <span className="text-zinc-500 capitalize">{status}</span>}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto px-1.5 text-sm text-zinc-400 hover:text-zinc-900"
        >
          ×
        </button>
      </div>
      <div className="px-4 pb-2">
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 8, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 8, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <ReferenceArea
              y1={min}
              y2={max}
              fill="#d4d4d8"
              fillOpacity={0.2}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#18181b"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: "#18181b" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendPanel({
  selectedKeys,
  readings,
  vocabulary,
  onRemove,
}: {
  selectedKeys: string[];
  readings: BloodworkReading[];
  vocabulary: VocabularyEntry[];
  onRemove: (key: string) => void;
}) {
  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyEntry>();
    for (const v of vocabulary) map.set(v.key, v);
    return map;
  }, [vocabulary]);

  if (selectedKeys.length === 0) return null;

  return (
    <div className="border border-zinc-200 bg-white">
      {selectedKeys.map((key, i) => {
        const entry = vocabMap.get(key);
        if (!entry) return null;
        return (
          <div
            key={key}
            className={
              i < selectedKeys.length - 1 ? "border-b border-zinc-200" : ""
            }
          >
            <BiomarkerTrend
              entry={entry}
              readings={readings}
              onRemove={() => onRemove(key)}
            />
          </div>
        );
      })}
      <div className="border-t border-zinc-200 px-4 py-3">
        {selectedKeys.map((key) => {
          const entry = vocabMap.get(key);
          if (!entry || !entry.description) return null;
          return (
            <div key={key} className="mb-2 last:mb-0">
              <div className="text-[10px] font-bold tracking-[1px] uppercase">
                {entry.label}
              </div>
              <div className="text-[11px] leading-relaxed text-zinc-500">
                {entry.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/trend-panel.test.tsx`
Expected: PASS

- [ ] **Step 5: Run check and commit**

Run: `bun run check`

```bash
git add components/dashboard/trend-panel.tsx components/dashboard/trend-panel.test.tsx
git commit -m "feat: add unified trend panel component"
```

---

### Task 4: Wire everything into the dashboard and remove old Trends section

**Files:**
- Modify: `app/page.tsx`
- Create: `components/dashboard/metrics-section.tsx`
- Modify: `components/dashboard/section-nav.tsx`
- Delete: `components/dashboard/trend-chart.tsx`
- Delete: `components/dashboard/trend-chart.test.tsx`

- [ ] **Step 1: Create the MetricsSection client component**

This component owns the selection state and renders the featured grid, trend panel, and dense table. Create `components/dashboard/metrics-section.tsx`:

```tsx
"use client";

import { useState } from "react";

import type { BiomarkerMetric } from "@/components/dashboard/biomarker-table";
import { BiomarkerTable } from "@/components/dashboard/biomarker-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendPanel } from "@/components/dashboard/trend-panel";
import type { BloodworkReading, Status, VocabularyEntry } from "@/types/bloodwork";

const MAX_SELECTED = 10;

export function MetricsSection({
  featured,
  nonFeatured,
  readings,
  vocabulary,
}: {
  featured: BiomarkerMetric[];
  nonFeatured: BiomarkerMetric[];
  readings: BloodworkReading[];
  vocabulary: VocabularyEntry[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, key];
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {featured.map((m) => (
          <div
            key={m.vocabularyKey}
            onClick={() => toggle(m.vocabularyKey)}
            className={`cursor-pointer ${
              selected.includes(m.vocabularyKey)
                ? "[&>div]:border-zinc-900"
                : ""
            }`}
          >
            <MetricCard
              label={m.label}
              value={m.value}
              unit={m.unit}
              min={m.min}
              max={m.max}
              status={m.status}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <TrendPanel
          selectedKeys={selected}
          readings={readings}
          vocabulary={vocabulary}
          onRemove={(key) =>
            setSelected((prev) => prev.filter((k) => k !== key))
          }
        />
      </div>

      {nonFeatured.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
            All Biomarkers
          </h3>
          <BiomarkerTable
            metrics={nonFeatured}
            selected={selected}
            onToggle={toggle}
          />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Update app/page.tsx**

Replace the metrics and trends sections. Remove `TrendChart` import. Add `MetricsSection` import. Split metrics into featured and nonFeatured:

```tsx
import { MetricsSection } from "@/components/dashboard/metrics-section";
```

Remove the `TrendChart` import line.

Replace the metrics computation to split by featured:

```tsx
const allMetrics = latest
  ? latest.measurements.map((m) => {
      const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
      if (!entry)
        throw new Error(`Unknown vocabulary key: ${m.vocabularyKey}`);
      return {
        vocabularyKey: m.vocabularyKey,
        label: entry.label,
        value: m.value,
        unit: m.unit,
        min: entry.referenceRange.min,
        max: entry.referenceRange.max,
        status: m.status as Status,
      };
    })
  : [];

const featured = allMetrics.filter((m) => {
  const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
  return entry?.featured;
});
const nonFeatured = allMetrics.filter((m) => {
  const entry = vocabulary.find((e) => e.key === m.vocabularyKey);
  return !entry?.featured;
});
```

Replace the metrics section JSX:

```tsx
<section id="metrics" className="mb-8">
  <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
    Metrics · {latestDate}
  </h2>
  <MetricsSection
    featured={featured}
    nonFeatured={nonFeatured}
    readings={readings.map((r) => ({
      date: r.date,
      source: r.source,
      measurements: r.measurements,
    }))}
    vocabulary={vocabulary}
  />
</section>
```

Remove the entire trends section (the `<section id="trends">` block).

- [ ] **Step 3: Update SectionNav**

In `components/dashboard/section-nav.tsx`, remove the trends entry from `SECTIONS`:

```typescript
const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "health", label: "Health" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;
```

- [ ] **Step 4: Delete old TrendChart files**

```bash
rm components/dashboard/trend-chart.tsx components/dashboard/trend-chart.test.tsx
```

- [ ] **Step 5: Fix any existing tests that reference old vocabulary type**

Search for test files that create `VocabularyEntry` objects without `featured` and add `featured: false` to them. Check files like test fixtures or other component tests.

- [ ] **Step 6: Run check and commit**

Run: `bun run check`
Expected: all checks pass

```bash
git add -A
git commit -m "feat: wire metrics section redesign and remove trends"
```

---

### Task 5: Final validation

- [ ] **Step 1: Run full validation suite**

Run: `bun run check:full`
Expected: all checks pass, build succeeds

- [ ] **Step 2: Manual verification**

Start dev server with `bun run dev` and verify:
- Featured biomarkers appear as cards in the grid
- Non-featured biomarkers appear in the dense table
- Clicking a card or row opens the trend panel between grid and table
- Multiple biomarkers stack in one unified component
- Descriptions appear at the bottom of the trend panel
- Reference range bands show as neutral gray
- × button removes a biomarker from the panel
- Max 10 selection limit works
- Section nav no longer shows "Trends"
- Admin vocabulary editor shows "Featured" checkbox column
