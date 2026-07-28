# Apple Health Import — Design Spec

## Overview

Replace the iOS Shortcut–based health metric ingestion with a two-step workflow:

1. **Local CLI script** — parses Apple Health `export.xml` on the user's machine, outputs a single JSON file with aggregated daily metrics and config metadata.
2. **Admin panel drop zone** — drag the JSON file onto the Health tab, which uploads it to the server. Visibility toggles control which metrics appear on the public dashboard.

This replaces the previous `POST /api/health-metrics` bearer token endpoint entirely. XML parsing happens locally (not in the browser), keeping the admin UI simple.

## Local CLI Script

### Location and usage

`scripts/parse-health-export.ts` — run with:

```
bun run scripts/parse-health-export.ts ~/Desktop/export.xml -o health-data.json
```

### Behavior

1. SAX-streams the XML to handle multi-GB files without loading into memory.
2. Extracts all `<Record>` elements.
3. Converts Apple Health type identifiers to snake_case keys by stripping the `HKQuantityTypeIdentifier` / `HKCategoryTypeIdentifier` prefix (e.g., `HKQuantityTypeIdentifierHeartRate` → `heart_rate`).
4. Aggregates per day using hardcoded strategies (see mapping below).
5. Unknown metrics default to `avg`.
6. Outputs a single JSON file matching the `POST /api/health-import` request shape.

### Output format

```json
{
  "metrics": [
    {
      "date": "2026-04-03",
      "metric": "heart_rate",
      "value": 62.3,
      "unit": "bpm"
    }
  ],
  "configs": [
    {
      "metric": "heart_rate",
      "label": "Heart Rate",
      "unit": "bpm",
      "aggregation": "avg"
    }
  ]
}
```

### Aggregation mapping

| Strategy   | Metric types                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sum`      | Steps, Active Energy, Basal Energy, Flights Climbed, Distance Walking/Running, Exercise Time                                                                                                   |
| `avg`      | Heart Rate, Resting Heart Rate, HRV, Weight, Body Mass Index, Blood Pressure Systolic/Diastolic, VO2 Max, Respiratory Rate, Body Temperature, Blood Oxygen                                     |
| `duration` | Sleep Analysis — categorical records where duration is computed from `endDate - startDate` (not from `value`). Only records with asleep-category values are included. Summed per day in hours. |

Unknown types default to `avg`.

### Metric key derivation

Apple Health type identifiers (e.g., `HKQuantityTypeIdentifierHeartRate`) are converted to short snake_case keys by stripping the `HKQuantityTypeIdentifier` / `HKCategoryTypeIdentifier` prefix and converting to snake_case (e.g., `heart_rate`). This key is used in both `health_metrics.metric` and `health_metric_config.metric`.

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
- Composite primary key enables upsert via `INSERT OR REPLACE`.

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
- `aggregation`: one of `avg`, `sum`, `duration`.
- `visible`: `0` = hidden, `1` = shown on public dashboard.
- New metrics inserted with `INSERT OR IGNORE` to preserve existing visibility on re-import.

## API Endpoints

### Remove

- `POST /api/health-metrics` — iOS Shortcut endpoint (deleted entirely)

### Add

#### `POST /api/health-import`

Receives the JSON file contents from the admin UI.

**Auth:** Session cookie (admin only, protected by middleware).

**Request:** Same shape as the CLI script output:

```json
{
  "metrics": [
    {
      "date": "2026-04-03",
      "metric": "heart_rate",
      "value": 62.3,
      "unit": "bpm"
    }
  ],
  "configs": [
    {
      "metric": "heart_rate",
      "label": "Heart Rate",
      "unit": "bpm",
      "aggregation": "avg"
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

**Idle state:** Dashed-border drop zone with "Drop health-data.json here" text and click-to-select fallback. Accepts only `.json` files.

**Uploading state:** Brief loading indicator while POSTing to `/api/health-import`.

**Complete state:** Success message with counts (e.g., "Imported 23 metrics, 1,247 days"), then returns to idle state.

### Dashboard visibility section

- Header: "Dashboard visibility" with count label (e.g., "5 of 18 shown").
- All metrics from `health_metric_config` rendered as chips.
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

1. Server component queries visible metrics joined with config.
2. Passes metric data + config as props to `HealthGrid`.
3. `HealthGrid` renders one `HealthChart` per visible metric, sorted alphabetically.
4. `HealthMetricKey` type replaced with `string` — metric keys are dynamic.

### Blood pressure special case

If both `blood_pressure_systolic` and `blood_pressure_diastolic` are visible, they combine into a single `BloodPressureChart` card (same as current behavior). They count as one card in the grid.

### No other dashboard changes

Period selector (1M, 6M, 1Y), linear regression trend lines, chart styling, and grid layout (`grid-cols-1` mobile, `md:grid-cols-2` desktop) remain unchanged.

## Cleanup

- Delete `app/api/health-metrics/route.ts`.
- Remove `HEALTH_API_TOKEN` env var from Cloudflare secrets.
- Remove bearer token auth logic.
- Update `middleware.ts` to protect `/api/health-import` and `/api/health-config`.
- Update `specs/architecture.md` with new endpoints and removed endpoint.

## Files to Create or Modify

### New files

- `scripts/parse-health-export.ts` — CLI script: SAX parser + aggregation + JSON output
- `app/admin/health/page.tsx` — admin Health tab page
- `components/admin/health-import.tsx` — drop zone + upload logic
- `components/admin/health-visibility.tsx` — metric visibility toggles
- `app/api/health-import/route.ts` — POST endpoint for import data
- `app/api/health-config/route.ts` — PATCH endpoint for visibility toggle

### Modified files

- `db/schema.sql` — drop old `health_metrics`, recreate + add `health_metric_config`
- `db/queries.ts` — add `getHealthMetricConfigs`, `getVisibleHealthMetrics`, `updateMetricVisibility`; remove old `getHealthMetrics`
- `types/health.ts` — remove hardcoded `HEALTH_METRIC_KEYS`, make metric key a string, add config types
- `app/admin/layout.tsx` — add "Health" tab to admin nav
- `app/page.tsx` — pass config data to `HealthGrid`
- `components/dashboard/health-grid.tsx` — render dynamically from config instead of hardcoded array
- `app/api/data/route.ts` — join with config, filter by visible
- `middleware.ts` — protect new endpoints, remove bearer token logic

### Deleted files

- `app/api/health-metrics/route.ts`
