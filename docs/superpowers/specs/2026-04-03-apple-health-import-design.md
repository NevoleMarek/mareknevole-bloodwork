# Apple Health Import — Design Spec

## Overview

Import daily health metrics from Apple Health into the bloodwork dashboard via an iOS Shortcut. Metrics are displayed in a new "Health" section on the public dashboard as a grid of individual time-series charts with linear trend lines.

## Metrics

| Key                        | Label        | Unit      | Source                                         |
| -------------------------- | ------------ | --------- | ---------------------------------------------- |
| `weight`                   | Weight       | kg        | Apple Health                                   |
| `resting_hr`               | Resting HR   | bpm       | Apple Health                                   |
| `hrv`                      | HRV          | ms        | Apple Health                                   |
| `blood_pressure_systolic`  | BP Systolic  | mmHg      | Apple Health                                   |
| `blood_pressure_diastolic` | BP Diastolic | mmHg      | Apple Health                                   |
| `sleep_duration`           | Sleep        | hr        | Apple Health (computed sum of sleep intervals) |
| `vo2_max`                  | VO2 Max      | mL/kg/min | Apple Health                                   |

## Data Storage

New `health_metrics` table in D1:

```sql
CREATE TABLE health_metrics (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (date, metric)
);
```

- One row per metric per day.
- Composite primary key `(date, metric)` enables upsert — re-running the Shortcut for the same day overwrites cleanly.
- `metric` must be one of the 7 known keys listed above.
- Blood pressure stored as two separate metrics (systolic + diastolic).

## API Endpoint

`POST /api/health-metrics` — upserts a batch of metrics for a given date.

### Authentication

Accepts either:

1. Session cookie (same as other admin endpoints)
2. `Authorization: Bearer <token>` header using a static `HEALTH_API_TOKEN` Cloudflare secret

The auth middleware is extended to accept the bearer token for this endpoint.

### Request

```json
{
  "date": "2026-04-03",
  "metrics": [
    { "metric": "weight", "value": 82.5, "unit": "kg" },
    { "metric": "resting_hr", "value": 58, "unit": "bpm" },
    { "metric": "hrv", "value": 42, "unit": "ms" },
    { "metric": "blood_pressure_systolic", "value": 120, "unit": "mmHg" },
    { "metric": "blood_pressure_diastolic", "value": 78, "unit": "mmHg" },
    { "metric": "sleep_duration", "value": 7.3, "unit": "hr" },
    { "metric": "vo2_max", "value": 45.2, "unit": "mL/kg/min" }
  ]
}
```

### Validation

- `date` must be a valid ISO date string.
- `metrics` must be a non-empty array.
- Each `metric` must be one of the 7 known keys — unknown keys are rejected.
- `value` must be a finite number.
- `unit` must be a non-empty string.

### Response

- `200 OK` with `{ "saved": 7 }` on success.
- `400 Bad Request` with error details on validation failure.
- `401 Unauthorized` if neither session cookie nor valid bearer token is present.

### Storage

All metrics are upserted in a single D1 transaction using `INSERT OR REPLACE`.

## Dashboard UI

### Section Placement

New "Health" section on the public dashboard, between the existing "Trends" and "Supplements" sections.

### Layout

- Section header: `HEALTH` — `text-[9px] tracking-[2px] uppercase text-zinc-400`
- Period selector above the grid: `1M`, `6M`, `1Y` toggle buttons — shared across all charts. Same visual style as the existing trend chart period selector (bordered pills, active state `bg-zinc-900 text-white`).
- Grid: `grid-cols-1` on mobile, `md:grid-cols-2` on desktop.
- Each cell: `border border-zinc-200 bg-white p-4`.

### Chart Cards

Each card contains:

- **Top row:** metric label (left, `text-[10px] uppercase tracking-widest text-zinc-400`) and latest value + unit (right, `text-lg font-bold` + `text-xs text-zinc-500`).
- **Chart:** Recharts `LineChart`, ~120px height.
  - Data line: `#18181b` (zinc-900), solid, `strokeWidth: 1.5`, small dots.
  - Linear regression trend line: `#a1a1aa` (zinc-400), dashed, no dots.
  - X-axis: date labels (`text-[9px]`), no axis line.
  - Y-axis: value labels (`text-[9px]`), no axis line.
  - Tooltip: same style as existing trend chart.

### Blood Pressure Card

Single card with two data lines (systolic + diastolic) and two trend lines. Systolic is solid, diastolic is dashed. Latest value shows as "120/78 mmHg".

### Chart Configuration

6 chart cards total:

1. Weight
2. Resting HR
3. HRV
4. Blood Pressure (combined systolic + diastolic)
5. Sleep
6. VO2 Max

### Data Flow

1. `page.tsx` server component queries `health_metrics` from D1.
2. Passes raw data as props to a new `HealthGrid` client component.
3. `HealthGrid` handles period filtering and linear regression computation client-side.

### Linear Regression

Simple least-squares linear regression computed from the filtered data points. For each metric, compute slope and intercept, then render a straight line from the first to last data point in the period.

## iOS Shortcut

Step-by-step recipe for the user to build in iOS Shortcuts:

### Setup

1. Create a new Shortcut named "Sync Health Data".
2. Store the API token and URL as Shortcut variables or in a text action at the top.

### Data Collection Steps

For each metric, add a "Find Health Samples" action:

1. **Weight:** Find Health Samples where Type is Weight, sorted by date (most recent), limit 1.
2. **Resting Heart Rate:** Find Health Samples where Type is Resting Heart Rate, Start Date is in the last 1 day, sorted by date (most recent), limit 1.
3. **Heart Rate Variability:** Find Health Samples where Type is Heart Rate Variability, Start Date is in the last 1 day, sorted by date (most recent), limit 1.
4. **Blood Pressure:** Find Health Samples where Type is Blood Pressure Systolic/Diastolic, Start Date is in the last 1 day, sorted by date (most recent), limit 1 each.
5. **Sleep Duration:** Find Health Samples where Type is Sleep Analysis, Start Date is yesterday. Sum the duration of all "Asleep" intervals in hours.
6. **VO2 Max:** Find Health Samples where Type is VO2 Max, sorted by date (most recent), limit 1.

### Build and Send

1. Build a Dictionary matching the request body schema above, using yesterday's date.
2. "Get Contents of URL" action: POST to `https://bloodwork.mareknevole.com/api/health-metrics` with `Authorization: Bearer <token>` header and the JSON body.

### Automation

Set up a Personal Automation: "Time of Day" → 6:00 AM → Run Immediately → select the "Sync Health Data" shortcut.

## Files to Create or Modify

### New files

- `app/api/health-metrics/route.ts` — POST endpoint
- `components/dashboard/health-grid.tsx` — grid of chart cards
- `components/dashboard/health-chart.tsx` — individual metric chart with trend line
- `types/health.ts` — types for health metrics

### Modified files

- `db/schema.sql` — add `health_metrics` table
- `db/queries.ts` — add `getHealthMetrics` query function
- `app/page.tsx` — add Health section between Trends and Supplements
- `middleware.ts` — extend to accept bearer token auth for `/api/health-metrics`
- `components/dashboard/section-nav.tsx` — add "Health" to navigation
- `app/api/data/route.ts` — include health metrics in public data response
