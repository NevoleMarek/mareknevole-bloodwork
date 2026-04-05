# Metrics Section Redesign

## Overview

Redesign the dashboard metrics and trends into a single unified section. Featured biomarkers display as cards in a grid, remaining biomarkers display in a dense table, and clicking any biomarker opens it in a unified stacked trend panel with reference range bands and descriptions.

## Data Model

Add a `featured` column (`INTEGER`, 0/1, default 0) to the `vocabulary` table. This flag controls whether a biomarker appears in the featured grid (1) or the dense table (0).

```sql
ALTER TABLE vocabulary ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
```

## Dashboard Layout

The Metrics section replaces both the current Metrics and Trends sections. Top to bottom:

1. **Section header** — "Metrics · {date}" (unchanged format)
2. **Featured grid** — 2-col mobile / 4-col desktop. Shows only `featured=true` biomarkers from the latest reading. Each card: label, value, unit, range bar (existing `MetricCard` component).
3. **Unified trend panel** — appears between grid and table when any biomarker is selected. See below.
4. **Dense table** — all non-featured biomarkers from the latest reading. Columns: status dot, name, value, reference range, unit. Rows are clickable.

## Unified Trend Panel

A single bordered white container (`border border-zinc-200 bg-white`) that holds all selected biomarkers.

### Per biomarker (repeating):

- **Header line** — single row containing: name (bold uppercase, 10px, tracking), range + unit (muted), latest value (bold), status text, × close button (right-aligned). Separated from next biomarker by `border-zinc-200`.
- **Chart** — compact line chart (~80px tall). Reference range displayed as a neutral band (`bg-zinc-200` at low opacity). X-axis: dates of all readings. Y-axis: value scale derived from data points and reference range. Data points as small dots connected by a line.

### Bottom section (shared):

- **Descriptions** — separated from charts by `border-zinc-200`. Each selected biomarker's name (bold uppercase) + description text (muted, 11px), stacked vertically.

### Behavior:

- Clicking a featured card or dense table row toggles that biomarker in/out of the panel
- Selected cards get a dark border (`border-zinc-900`), selected table rows get highlighted background (`bg-zinc-50`)
- Maximum 10 biomarkers selected at once — additional clicks on unselected biomarkers are ignored
- Panel only renders when at least 1 biomarker is selected
- If a biomarker has only 1 data point, the chart shows a single dot (no line) — the panel still opens normally
- Client component for interactivity; trend data (all readings) passed from the server

## Dense Table

A `<table>` with `border border-zinc-200 bg-white`, collapsed borders.

| Column | Style |
|--------|-------|
| Status dot | 6px circle, color matches status (green/amber/red/blue at 60% opacity) |
| Name | `font-semibold`, 13px |
| Value | `font-bold`, 13px |
| Reference | muted, 12px, format: "min – max" |
| Unit | muted, 12px |

Header row: 9px uppercase tracking, muted color, thin bottom border. Body rows: clickable, hover `bg-zinc-50`.

## Admin Changes

The vocabulary editor (`components/admin/vocabulary-editor.tsx`) gets a "Featured" toggle column — a checkbox per vocabulary entry. Updates via the existing `PUT /api/vocabulary` endpoint, which already handles vocabulary field updates. The `featured` field is added to the `VocabularyEntry` type.

## Removals

- **`TrendChart` component** (`components/dashboard/trend-chart.tsx`) — deleted
- **Trends section** in `app/page.tsx` — removed
- **"Trends" entry** in `SectionNav` — removed
- The `topMetricKeys` helper logic is no longer needed

## Charting

Use Recharts (already a dependency) for the trend line charts within the unified panel. Each biomarker gets its own `LineChart` with:
- `ReferenceArea` for the neutral reference range band
- `Line` with data points
- Compact axis formatting (month/year on X, minimal ticks on Y)

## Types

Update `VocabularyEntry` in `types/bloodwork.ts`:

```typescript
export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
  featured: boolean;  // NEW
};
```

## Responsive

- Featured grid: `grid-cols-2 md:grid-cols-4` (unchanged)
- Dense table: `overflow-x-auto` wrapper for mobile horizontal scroll
- Trend panel: full width, charts scale horizontally
- On mobile, the trend header line may wrap — use `flex-wrap` with sensible grouping
