# Apple Health XML Import — Design Spec

## Overview

Replace the iOS Shortcut–based health metric ingestion with a browser-based XML import in the admin panel. The user drops an Apple Health `export.xml` file onto the admin Health tab. The file is parsed client-side using a streaming SAX parser, aggregated to daily values, and uploaded to D1. A separate visibility toggle controls which metrics appear on the public dashboard.

This replaces the previous `POST /api/health-metrics` bearer token endpoint entirely.

## Data Storage

### `health_metrics` table (replaces existing)

```sql
DROP TABLE IF EXISTS health_metrics;

CREATE TABLE health_metrics (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (date, metric)
);
```

- One row per metric per day.
- Composite primary key enables dedup via `INSERT OR REPLACE` — re-importing the same or overlapping export overwrites with identical aggregated values.

### `health_metric_config` table (new)

```sql
CREATE TABLE health_metric_config (
  metric TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 0
);
```

- One row per discovered metric type.
- `aggregation`: one of `avg`, `sum` — determines how raw records become daily values.
- `visible`: `0` = hidden, `1` = shown on public dashboard.
- New metrics are inserted with `INSERT OR IGNORE` to preserve existing visibility settings on re-import.

## XML Parsing

### Apple Health export.xml structure

Records are `<Record>` elements with attributes:

- `type`: e.g., `HKQuantityTypeIdentifierHeartRate`
- `startDate`: ISO-ish datetime
- `value`: numeric string
- `unit`: e.g., `count/min`, `kg`, `ms`

### Streaming parse

The file is parsed client-side using a SAX-style streaming parser. As each `<Record>` element is encountered:

1. Extract `type`, `startDate` (truncated to date), `value`, `unit`.
2. Look up the aggregation strategy for this type.
3. Accumulate into a `Map<metric, Map<date, {sum, count}>>`.

After parsing completes, compute final values:

- `avg` metrics: `sum / count`
- `sum` metrics: `sum`

### Metric key derivation

Apple Health type identifiers (e.g., `HKQuantityTypeIdentifierHeartRate`) are converted to short snake_case keys by stripping the `HKQuantityTypeIdentifier` / `HKCategoryTypeIdentifier` prefix and converting to snake_case (e.g., `heart_rate`). This key is used in both `health_metrics.metric` and `health_metric_config.metric`.

### Aggregation mapping

Hardcoded lookup from Apple Health type identifiers to aggregation strategy:

| Strategy   | Metric types                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sum`      | Steps, Active Energy, Basal Energy, Flights Climbed, Distance Walking/Running, Exercise Time                                                                                                   |
| `avg`      | Heart Rate, Resting Heart Rate, HRV, Weight, Body Mass Index, Blood Pressure Systolic/Diastolic, VO2 Max, Respiratory Rate, Body Temperature, Blood Oxygen                                     |
| `duration` | Sleep Analysis — categorical records where duration is computed from `endDate - startDate` (not from `value`). Only records with asleep-category values are included. Summed per day in hours. |

Unknown types default to `avg`.

### Discovery

All unique record types found in the XML are collected. After parsing, they're sent to the server as config entries alongside the aggregated data. This means the set of available metrics grows automatically with each import.

## API Endpoints

### Remove

- `POST /api/health-metrics` — iOS Shortcut endpoint (deleted entirely)

### Add

#### `POST /api/health-import`

Receives parsed and aggregated data from the admin UI.

**Auth:** Session cookie (admin only, protected by middleware).

**Request:**

```json
{
  "metrics": [
    {
      "date": "2026-04-03",
      "metric": "heart_rate",
      "value": 62.3,
      "unit": "bpm"
    },
    { "date": "2026-04-03", "metric": "steps", "value": 8432, "unit": "count" }
  ],
  "configs": [
    {
      "metric": "heart_rate",
      "label": "Heart Rate",
      "unit": "bpm",
      "aggregation": "avg"
    },
    {
      "metric": "steps",
      "label": "Steps",
      "unit": "count",
      "aggregation": "sum"
    }
  ]
}
```

**Behavior:**

- `INSERT OR REPLACE` all metrics into `health_metrics`.
- `INSERT OR IGNORE` all configs into `health_metric_config` (preserves existing visibility).
- Batched in a D1 transaction.

**Response:** `200 OK` with `{ "saved": <count> }`.

#### `PATCH /api/health-config`

Toggles metric visibility on the dashboard.

**Auth:** Session cookie.

**Request:**

```json
{ "metric": "heart_rate", "visible": true }
```

**Behavior:** Updates `visible` on `health_metric_config` for the given metric.

**Response:** `200 OK` with `{ "ok": true }`.

### Modified

#### `GET /api/data`

Updated to join `health_metrics` with `health_metric_config WHERE visible = 1`. Only visible metrics are returned to the public dashboard.

## Admin UI — Health Tab

New tab in the admin layout at `/admin/health`.

### Layout

Two always-visible sections, stacked vertically:

1. **Import section** — file drop zone at top.
2. **Dashboard visibility section** — toggleable metric chips below.

### Import section

**Idle state:** Dashed-border drop zone with "Drop export.xml here" text and click-to-select fallback.

**Processing state:** The drop zone transforms into a progress display:

- Progress bar with percentage.
- Live stats: metric type count, day count, record count.

**Complete state:** Brief success message (e.g., "Imported 23 metrics, 1,247 days"), then returns to idle state.

### Dashboard visibility section

- Header: "Dashboard visibility" with count label (e.g., "8 of 23 shown").
- All metrics from `health_metric_config` rendered as chips/tags.
- Highlighted chip = visible on dashboard. Dimmed chip = hidden.
- Click to toggle. Changes save immediately via `PATCH /api/health-config`.
- Chips sorted alphabetically.

### Styling

Follows existing admin patterns and `specs/style.md`:

- `bg-white border border-zinc-200` cards, no rounded corners, no shadows.
- Geist Mono typography throughout.
- Chip active state: `bg-zinc-800 text-white border-zinc-800`.
- Chip inactive state: `text-zinc-400 border-zinc-200`.

## Public Dashboard Changes

### Dynamic metric rendering

`HealthGrid` no longer renders a hardcoded set of 6 chart cards. Instead:

1. Server component queries visible metrics (joined with config).
2. Passes metric data + config as props to `HealthGrid`.
3. `HealthGrid` renders one `HealthChart` per visible metric, sorted alphabetically.

### Blood pressure special case

If both `blood_pressure_systolic` and `blood_pressure_diastolic` are visible, they combine into a single `BloodPressureChart` card (same as current behavior). They count as one card in the grid.

### No other dashboard changes

Period selector (1M, 6M, 1Y), linear regression trend lines, chart styling, and grid layout (`grid-cols-1` mobile, `md:grid-cols-2` desktop) remain unchanged.

## Cleanup

- Delete `app/api/health-metrics/route.ts`.
- Remove `HEALTH_API_TOKEN` env var from Cloudflare secrets.
- Remove bearer token auth logic from the health metrics route.
- Update `middleware.ts` to protect `/api/health-import` and `/api/health-config`.
- Update `specs/architecture.md` with new endpoints and removed endpoint.
- Update existing health metric tests to reflect new data flow.

## Files to Create or Modify

### New files

- `app/admin/health/page.tsx` — admin Health tab page
- `components/admin/health-import.tsx` — drop zone + parsing + upload logic
- `components/admin/health-visibility.tsx` — metric visibility toggles
- `app/api/health-import/route.ts` — POST endpoint for aggregated data
- `app/api/health-config/route.ts` — PATCH endpoint for visibility toggle
- `lib/apple-health-parser.ts` — SAX streaming parser + aggregation logic

### Modified files

- `db/schema.sql` — drop old `health_metrics`, recreate + add `health_metric_config`
- `db/queries.ts` — add `getHealthMetricConfigs`, `getVisibleHealthMetrics`, `updateMetricVisibility`; remove old `getHealthMetrics`
- `app/admin/layout.tsx` — add "Health" tab to admin nav
- `app/page.tsx` — pass config data to `HealthGrid`
- `components/dashboard/health-grid.tsx` — render dynamically from config
- `app/api/data/route.ts` — join with config, filter by visible
- `middleware.ts` — protect new endpoints, remove bearer token logic

### Deleted files

- `app/api/health-metrics/route.ts`
