# Apple Health Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS Shortcut health ingestion with a local CLI script that parses Apple Health XML exports into JSON, plus an admin drop zone for uploading and visibility toggles for the public dashboard.

**Architecture:** Local TypeScript CLI script uses SAX streaming to parse Apple Health XML into aggregated daily JSON. Admin panel uploads JSON to a new API endpoint. A config table tracks discovered metrics and their dashboard visibility. The public dashboard renders charts dynamically from visible config entries.

**Tech Stack:** Bun, TypeScript, Next.js, D1, Tailwind CSS, Recharts, Vitest

---

## File Structure

### New files

| File | Responsibility |
| ---- | -------------- |
| `scripts/parse-health-export.ts` | CLI script: SAX parse XML, aggregate daily, output JSON |
| `scripts/parse-health-export.test.ts` | Tests for the parsing/aggregation logic |
| `app/api/health-import/route.ts` | POST endpoint: receive JSON, upsert metrics + configs |
| `app/api/health-config/route.ts` | PATCH endpoint: toggle metric visibility |
| `app/admin/health/page.tsx` | Admin Health tab server component |
| `components/admin/health-import.tsx` | Drop zone + upload client component |
| `components/admin/health-visibility.tsx` | Metric visibility toggles client component |
| `components/admin/health-admin.tsx` | Client wrapper coordinating import + visibility with refresh |

### Modified files

| File | Change |
| ---- | ------ |
| `types/health.ts` | Remove hardcoded keys, add config types, make metric a string |
| `db/schema.sql` | Add `health_metric_config` table |
| `db/queries.ts` | Add config queries, update `getHealthMetrics` to join with config |
| `db/queries.test.ts` | Add mapper test for new config row mapper |
| `app/admin/layout.tsx` | Add "Health" nav item |
| `middleware.ts` | Add `/api/health-import` and `/api/health-config` to matcher |
| `app/api/data/route.ts` | Use new `getVisibleHealthMetrics` query |
| `app/page.tsx` | Pass config to `HealthGrid`, use new query |
| `components/dashboard/health-grid.tsx` | Render dynamically from config instead of hardcoded array |
| `components/dashboard/health-grid.test.tsx` | Update test data to use new types |
| `components/dashboard/health-chart.test.tsx` | Update test data to use new types |
| `components/dashboard/blood-pressure-chart.test.tsx` | Update test data to use new types |

### Deleted files

| File | Reason |
| ---- | ------ |
| `app/api/health-metrics/route.ts` | Replaced by `/api/health-import` |

---

### Task 1: Types and Schema

**Files:**
- Modify: `types/health.ts`
- Modify: `db/schema.sql`

- [ ] **Step 1: Update health types**

Replace the contents of `types/health.ts`:

```typescript
export type HealthMetric = {
  date: string;
  metric: string;
  value: number;
  unit: string;
};

export type HealthMetricConfig = {
  metric: string;
  label: string;
  unit: string;
  aggregation: "avg" | "sum" | "duration";
  visible: boolean;
};

export type HealthImportRequest = {
  metrics: { date: string; metric: string; value: number; unit: string }[];
  configs: {
    metric: string;
    label: string;
    unit: string;
    aggregation: string;
  }[];
};
```

- [ ] **Step 2: Add config table to schema**

Append to `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS health_metric_config (
  metric TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: Failures in files that import `HEALTH_METRIC_KEYS` or `HealthMetricKey` — this is expected. We'll fix these in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add types/health.ts db/schema.sql
git commit -m "feat: update health types and add config table schema"
```

---

### Task 2: Database Queries

**Files:**
- Modify: `db/queries.ts`
- Modify: `db/queries.test.ts`

- [ ] **Step 1: Write failing test for config row mapper**

Add to `db/queries.test.ts`:

```typescript
import {
  mapHealthMetricConfigRow,
  mapMeasurementRow,
  mapReadingRow,
  mapSupplementChangelogRow,
  mapSupplementRow,
  mapVocabularyRow,
} from "@/db/queries";

// ... keep existing tests ...

it("maps health metric config row", () => {
  const row = {
    metric: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    aggregation: "avg",
    visible: 1,
  };
  expect(mapHealthMetricConfigRow(row)).toEqual({
    metric: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    aggregation: "avg",
    visible: true,
  });
});

it("maps config row with visible=0 to false", () => {
  const row = {
    metric: "steps",
    label: "Steps",
    unit: "count",
    aggregation: "sum",
    visible: 0,
  };
  expect(mapHealthMetricConfigRow(row)).toEqual({
    metric: "steps",
    label: "Steps",
    unit: "count",
    aggregation: "sum",
    visible: false,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test db/queries.test.ts`
Expected: FAIL — `mapHealthMetricConfigRow` is not exported.

- [ ] **Step 3: Update queries.ts**

Replace the health-related imports, types, and functions in `db/queries.ts`:

Remove the `HEALTH_METRIC_KEYS` import line. Update the health imports:

```typescript
import type { HealthMetric, HealthMetricConfig } from "@/types/health";
```

Add the config row type alongside the existing `HealthMetricRow`:

```typescript
type HealthMetricConfigRow = {
  metric: string;
  label: string;
  unit: string;
  aggregation: string;
  visible: number;
};
```

Add the config row mapper:

```typescript
export function mapHealthMetricConfigRow(
  row: HealthMetricConfigRow,
): HealthMetricConfig {
  return {
    metric: row.metric,
    label: row.label,
    unit: row.unit,
    aggregation: row.aggregation as HealthMetricConfig["aggregation"],
    visible: row.visible === 1,
  };
}
```

Replace `getHealthMetrics` with two new query functions:

```typescript
export async function getVisibleHealthMetrics(
  db: D1Database,
): Promise<{ metrics: HealthMetric[]; configs: HealthMetricConfig[] }> {
  const [metricResults, configResults] = await Promise.all([
    db
      .prepare(
        `SELECT hm.date, hm.metric, hm.value, hm.unit
         FROM health_metrics hm
         JOIN health_metric_config hmc ON hm.metric = hmc.metric
         WHERE hmc.visible = 1
         ORDER BY hm.date`,
      )
      .all<HealthMetricRow>(),
    db
      .prepare(
        "SELECT metric, label, unit, aggregation, visible FROM health_metric_config WHERE visible = 1 ORDER BY label",
      )
      .all<HealthMetricConfigRow>(),
  ]);
  return {
    metrics: metricResults.results,
    configs: configResults.results.map(mapHealthMetricConfigRow),
  };
}

export async function getHealthMetricConfigs(
  db: D1Database,
): Promise<HealthMetricConfig[]> {
  const { results } = await db
    .prepare(
      "SELECT metric, label, unit, aggregation, visible FROM health_metric_config ORDER BY label",
    )
    .all<HealthMetricConfigRow>();
  return results.map(mapHealthMetricConfigRow);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test db/queries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add db/queries.ts db/queries.test.ts
git commit -m "feat: add health metric config queries and mapper"
```

---

### Task 3: API Endpoints

**Files:**
- Create: `app/api/health-import/route.ts`
- Create: `app/api/health-config/route.ts`
- Delete: `app/api/health-metrics/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Create health-import endpoint**

Create `app/api/health-import/route.ts`:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { HealthImportRequest } from "@/types/health";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const body = (await request.json()) as HealthImportRequest;

  if (!Array.isArray(body.metrics) || !Array.isArray(body.configs)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const metricStmts = body.metrics.map((m) =>
    db
      .prepare(
        "INSERT OR REPLACE INTO health_metrics (date, metric, value, unit) VALUES (?, ?, ?, ?)",
      )
      .bind(m.date, m.metric, m.value, m.unit),
  );

  const configStmts = body.configs.map((c) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO health_metric_config (metric, label, unit, aggregation, visible) VALUES (?, ?, ?, ?, 0)",
      )
      .bind(c.metric, c.label, c.unit, c.aggregation),
  );

  await db.batch([...configStmts, ...metricStmts]);

  return Response.json({ saved: body.metrics.length });
}
```

- [ ] **Step 2: Create health-config endpoint**

Create `app/api/health-config/route.ts`:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function PATCH(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const body = (await request.json()) as {
    metric: string;
    visible: boolean;
  };

  await db
    .prepare("UPDATE health_metric_config SET visible = ? WHERE metric = ?")
    .bind(body.visible ? 1 : 0, body.metric)
    .run();

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Delete old health-metrics route**

Delete the file `app/api/health-metrics/route.ts`.

- [ ] **Step 4: Update middleware**

In `middleware.ts`, add the new API routes to the matcher array:

```typescript
export const config = {
  matcher: [
    "/admin/:path+",
    "/api/extract/:path*",
    "/api/map/:path*",
    "/api/readings/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
    "/api/changelog/:path*",
    "/api/health-import/:path*",
    "/api/health-config/:path*",
  ],
};
```

Remove the `/api/health-metrics` matcher entry if present (it's not currently in the matcher since bearer token auth was handled in the route itself — but confirm).

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: May still have errors in files that import old `getHealthMetrics` — we fix those in Task 5.

- [ ] **Step 6: Commit**

```bash
git add app/api/health-import/route.ts app/api/health-config/route.ts middleware.ts
git rm app/api/health-metrics/route.ts
git commit -m "feat: add health import/config endpoints, remove old health-metrics route"
```

---

### Task 4: Admin UI

**Files:**
- Create: `components/admin/health-import.tsx`
- Create: `components/admin/health-visibility.tsx`
- Create: `app/admin/health/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create health-import component**

Create `components/admin/health-import.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";

type Status = "idle" | "uploading" | "done";

export function HealthImport({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      const body = await file.text();
      const res = await fetch("/api/health-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error}`);
        setStatus("idle");
        return;
      }
      setMessage(`Imported ${data.saved} metric rows`);
      setStatus("done");
      onImported();
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    },
    [onImported],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Import
      </div>
      {status === "idle" && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center border border-dashed border-zinc-300 px-4 py-10"
        >
          <span className="text-xs text-zinc-400">
            Drop health-data.json here
          </span>
          <span className="mt-1 text-[10px] text-zinc-300">
            or click to select
          </span>
          <input
            type="file"
            accept=".json"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}
      {status === "uploading" && (
        <div className="flex items-center justify-center border border-zinc-200 px-4 py-10">
          <span className="text-xs text-zinc-500">Uploading...</span>
        </div>
      )}
      {status === "done" && (
        <div className="flex items-center justify-center border border-zinc-200 px-4 py-10">
          <span className="text-xs text-zinc-500">{message}</span>
        </div>
      )}
      {status === "idle" && message && (
        <div className="mt-2 text-xs text-red-600">{message}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create health-visibility component**

Create `components/admin/health-visibility.tsx`:

```typescript
"use client";

import { useCallback, useOptimistic } from "react";

import type { HealthMetricConfig } from "@/types/health";

export function HealthVisibility({
  configs,
}: {
  configs: HealthMetricConfig[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    configs,
    (state, update: { metric: string; visible: boolean }) =>
      state.map((c) =>
        c.metric === update.metric ? { ...c, visible: update.visible } : c,
      ),
  );

  const visibleCount = optimistic.filter((c) => c.visible).length;

  const toggle = useCallback(
    async (metric: string, visible: boolean) => {
      setOptimistic({ metric, visible });
      await fetch("/api/health-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, visible }),
      });
    },
    [setOptimistic],
  );

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Dashboard visibility
        </span>
        <span className="text-[10px] text-zinc-400">
          {visibleCount} of {optimistic.length} shown
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {optimistic.map((c) => (
          <button
            key={c.metric}
            type="button"
            onClick={() => toggle(c.metric, !c.visible)}
            className={`px-2.5 py-1 text-[10px] transition-colors ${
              c.visible
                ? "border border-zinc-800 bg-zinc-800 text-white"
                : "border border-zinc-200 text-zinc-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin health page**

Create `app/admin/health/page.tsx`:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HealthImport } from "@/components/admin/health-import";
import { HealthVisibility } from "@/components/admin/health-visibility";
import { getHealthMetricConfigs } from "@/db/queries";

export default async function HealthPage() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);

  return <HealthAdmin configs={configs} />;
}

"use client";

import { useCallback, useState } from "react";
import type { HealthMetricConfig } from "@/types/health";

function HealthAdmin({ configs: initial }: { configs: HealthMetricConfig[] }) {
  const [configs, setConfigs] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/health-config");
    const data = await res.json();
    setConfigs(data);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <HealthImport onImported={refresh} />
      <HealthVisibility configs={configs} />
    </div>
  );
}
```

Wait — server and client components can't be mixed in one file like this. Split the approach:

Create `app/admin/health/page.tsx`:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HealthAdmin } from "@/components/admin/health-admin";
import { getHealthMetricConfigs } from "@/db/queries";

export default async function HealthPage() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);

  return <HealthAdmin configs={configs} />;
}
```

And create `components/admin/health-admin.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";

import { HealthImport } from "@/components/admin/health-import";
import { HealthVisibility } from "@/components/admin/health-visibility";
import type { HealthMetricConfig } from "@/types/health";

export function HealthAdmin({
  configs: initial,
}: {
  configs: HealthMetricConfig[];
}) {
  const [configs, setConfigs] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/health-config");
    const data = await res.json();
    setConfigs(data);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <HealthImport onImported={refresh} />
      <HealthVisibility configs={configs} />
    </div>
  );
}
```

This means we also need a GET handler on `/api/health-config` for the refresh. Add to `app/api/health-config/route.ts`:

```typescript
export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const { results } = await db
    .prepare(
      "SELECT metric, label, unit, aggregation, visible FROM health_metric_config ORDER BY label",
    )
    .all();
  return Response.json(
    results.map((row: any) => ({
      metric: row.metric,
      label: row.label,
      unit: row.unit,
      aggregation: row.aggregation,
      visible: row.visible === 1,
    })),
  );
}
```

- [ ] **Step 4: Add Health nav item**

In `app/admin/layout.tsx`, add to `navItems`:

```typescript
const navItems = [
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/vocabulary", label: "Vocabulary" },
  { href: "/admin/supplements", label: "Supplements" },
  { href: "/admin/health", label: "Health" },
] as const;
```

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: May still have errors in `app/page.tsx` and `health-grid.tsx` — fixed in next task.

- [ ] **Step 6: Commit**

```bash
git add components/admin/health-import.tsx components/admin/health-visibility.tsx components/admin/health-admin.tsx app/admin/health/page.tsx app/admin/layout.tsx app/api/health-config/route.ts
git commit -m "feat: add admin health tab with import drop zone and visibility toggles"
```

---

### Task 5: Dashboard Dynamic Rendering

**Files:**
- Modify: `components/dashboard/health-grid.tsx`
- Modify: `components/dashboard/health-grid.test.tsx`
- Modify: `components/dashboard/health-chart.test.tsx`
- Modify: `components/dashboard/blood-pressure-chart.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/api/data/route.ts`

- [ ] **Step 1: Update HealthGrid to render dynamically**

Replace `components/dashboard/health-grid.tsx`:

```typescript
"use client";

import { useMemo, useState } from "react";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

type Period = "1M" | "6M" | "1Y";

const PERIODS: Period[] = ["1M", "6M", "1Y"];

const PERIOD_MONTHS: Record<Period, number> = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
};

function filterByPeriod(data: HealthMetric[], period: Period): HealthMetric[] {
  const now = new Date();
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - PERIOD_MONTHS[period],
    now.getDate(),
  );
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export function HealthGrid({
  metrics,
  configs,
}: {
  metrics: HealthMetric[];
  configs: HealthMetricConfig[];
}) {
  const [period, setPeriod] = useState<Period>("6M");

  const filtered = useMemo(
    () => filterByPeriod(metrics, period),
    [metrics, period],
  );

  const byMetric = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of filtered) {
      const list = map.get(m.metric) ?? [];
      list.push(m);
      map.set(m.metric, list);
    }
    return map;
  }, [filtered]);

  const hasBP =
    configs.some((c) => c.metric === "blood_pressure_systolic") &&
    configs.some((c) => c.metric === "blood_pressure_diastolic");

  const singleConfigs = configs.filter(
    (c) =>
      c.metric !== "blood_pressure_systolic" &&
      c.metric !== "blood_pressure_diastolic",
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex shrink-0 border border-zinc-200 text-[9px]">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 ${
                period === p ? "bg-zinc-900 text-white" : "text-zinc-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hasBP && (
          <BloodPressureChart
            systolic={byMetric.get("blood_pressure_systolic") ?? []}
            diastolic={byMetric.get("blood_pressure_diastolic") ?? []}
          />
        )}
        {singleConfigs.map((config) => (
          <HealthChart
            key={config.metric}
            label={config.label}
            unit={config.unit}
            data={byMetric.get(config.metric) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update HealthGrid test**

Replace `components/dashboard/health-grid.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthGrid } from "@/components/dashboard/health-grid";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

const metrics: HealthMetric[] = [
  { date: "2026-03-01", metric: "weight", value: 82, unit: "kg" },
  { date: "2026-03-01", metric: "resting_hr", value: 58, unit: "bpm" },
  { date: "2026-03-01", metric: "hrv", value: 42, unit: "ms" },
  {
    date: "2026-03-01",
    metric: "blood_pressure_systolic",
    value: 120,
    unit: "mmHg",
  },
  {
    date: "2026-03-01",
    metric: "blood_pressure_diastolic",
    value: 80,
    unit: "mmHg",
  },
  { date: "2026-03-01", metric: "sleep_duration", value: 7.3, unit: "hr" },
];

const configs: HealthMetricConfig[] = [
  { metric: "weight", label: "Weight", unit: "kg", aggregation: "avg", visible: true },
  { metric: "resting_hr", label: "Resting HR", unit: "bpm", aggregation: "avg", visible: true },
  { metric: "hrv", label: "HRV", unit: "ms", aggregation: "avg", visible: true },
  { metric: "blood_pressure_systolic", label: "Blood Pressure Systolic", unit: "mmHg", aggregation: "avg", visible: true },
  { metric: "blood_pressure_diastolic", label: "Blood Pressure Diastolic", unit: "mmHg", aggregation: "avg", visible: true },
  { metric: "sleep_duration", label: "Sleep", unit: "hr", aggregation: "duration", visible: true },
];

describe("HealthGrid", () => {
  it("renders period selector buttons", () => {
    render(<HealthGrid metrics={metrics} configs={configs} />);
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
  });

  it("renders metric labels from config", () => {
    render(<HealthGrid metrics={metrics} configs={configs} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("HRV")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Update HealthChart test**

In `components/dashboard/health-chart.test.tsx`, update the `HealthMetric` import — remove `HealthMetricKey` if referenced. The test data stays the same since `metric` is now just `string`, which is compatible:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric } from "@/types/health";

const sampleData: HealthMetric[] = [
  { date: "2026-03-01", metric: "resting_hr", value: 58, unit: "bpm" },
  { date: "2026-03-15", metric: "resting_hr", value: 56, unit: "bpm" },
  { date: "2026-04-01", metric: "resting_hr", value: 55, unit: "bpm" },
];

describe("HealthChart", () => {
  it("renders metric label and latest value", () => {
    render(<HealthChart label="Resting HR" unit="bpm" data={sampleData} />);
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("bpm")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Update BloodPressureChart test**

Read `components/dashboard/blood-pressure-chart.test.tsx` and update the type import if it references `HealthMetricKey`. The test data shape stays the same.

- [ ] **Step 5: Update app/page.tsx**

In `app/page.tsx`, replace the `getHealthMetrics` import and usage:

Change the import:
```typescript
import {
  getActiveSupplements,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
```

Replace the `healthMetrics` fetch line:
```typescript
const { metrics: healthMetrics, configs: healthConfigs } =
  await getVisibleHealthMetrics(db);
```

Update the HealthGrid usage:
```typescript
<HealthGrid metrics={healthMetrics} configs={healthConfigs} />
```

- [ ] **Step 6: Update app/api/data/route.ts**

Replace the `getHealthMetrics` import with `getVisibleHealthMetrics` and update the response:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  getReadingsWithMeasurements,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";

export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const vocabulary = await getVocabulary(db);
  const readings = await getReadingsWithMeasurements(db);
  const { metrics: healthMetrics } = await getVisibleHealthMetrics(db);

  return Response.json({
    vocabulary: { entries: vocabulary },
    readings: readings.map((r) => ({
      date: r.date,
      source: r.source,
      measurements: r.measurements,
    })),
    healthMetrics,
  });
}
```

- [ ] **Step 7: Run check**

Run: `bun run check`
Expected: All tests pass, typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/health-grid.tsx components/dashboard/health-grid.test.tsx components/dashboard/health-chart.test.tsx components/dashboard/blood-pressure-chart.test.tsx app/page.tsx app/api/data/route.ts
git commit -m "feat: render health dashboard dynamically from metric config"
```

---

### Task 6: CLI Script — Core Parsing Logic

**Files:**
- Create: `scripts/parse-health-export.ts`
- Create: `scripts/parse-health-export.test.ts`

- [ ] **Step 1: Write test for metric key derivation and aggregation**

Create `scripts/parse-health-export.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  AGGREGATION_MAP,
  aggregateRecords,
  deriveMetricKey,
  deriveLabel,
  type RawRecord,
} from "./parse-health-export";

describe("deriveMetricKey", () => {
  it("strips HKQuantityTypeIdentifier prefix", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierHeartRate")).toBe(
      "heart_rate",
    );
  });

  it("strips HKCategoryTypeIdentifier prefix", () => {
    expect(deriveMetricKey("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
      "sleep_analysis",
    );
  });

  it("converts PascalCase to snake_case", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierVO2Max")).toBe("vo2_max");
  });

  it("handles BloodPressureSystolic", () => {
    expect(
      deriveMetricKey("HKQuantityTypeIdentifierBloodPressureSystolic"),
    ).toBe("blood_pressure_systolic");
  });
});

describe("deriveLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(deriveLabel("heart_rate")).toBe("Heart Rate");
  });

  it("handles single word", () => {
    expect(deriveLabel("weight")).toBe("Weight");
  });

  it("preserves VO2", () => {
    expect(deriveLabel("vo2_max")).toBe("Vo2 Max");
  });
});

describe("aggregateRecords", () => {
  const records: RawRecord[] = [
    {
      type: "HKQuantityTypeIdentifierHeartRate",
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:00:00 +0200",
      value: "60",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierHeartRate",
      startDate: "2026-04-01 12:00:00 +0200",
      endDate: "2026-04-01 12:00:00 +0200",
      value: "80",
      unit: "count/min",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
      startDate: "2026-04-01 08:00:00 +0200",
      endDate: "2026-04-01 08:05:00 +0200",
      value: "500",
      unit: "count",
    },
    {
      type: "HKQuantityTypeIdentifierStepCount",
      startDate: "2026-04-01 12:00:00 +0200",
      endDate: "2026-04-01 12:05:00 +0200",
      value: "300",
      unit: "count",
    },
  ];

  it("averages heart rate per day", () => {
    const result = aggregateRecords(records);
    const hr = result.metrics.find(
      (m) => m.metric === "heart_rate" && m.date === "2026-04-01",
    );
    expect(hr).toBeDefined();
    expect(hr!.value).toBe(70);
  });

  it("sums steps per day", () => {
    const result = aggregateRecords(records);
    const steps = result.metrics.find(
      (m) => m.metric === "step_count" && m.date === "2026-04-01",
    );
    expect(steps).toBeDefined();
    expect(steps!.value).toBe(800);
  });

  it("collects config entries for each metric type", () => {
    const result = aggregateRecords(records);
    expect(result.configs).toHaveLength(2);
    const hrConfig = result.configs.find((c) => c.metric === "heart_rate");
    expect(hrConfig).toEqual({
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "count/min",
      aggregation: "avg",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test scripts/parse-health-export.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parsing logic**

Create `scripts/parse-health-export.ts`:

```typescript
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

// -- Types --

export type RawRecord = {
  type: string;
  startDate: string;
  endDate: string;
  value: string;
  unit: string;
};

type DayBucket = { sum: number; count: number };

// -- Aggregation config --

const SUM_TYPES = new Set([
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBasalEnergyBurned",
  "HKQuantityTypeIdentifierFlightsClimbed",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierAppleExerciseTime",
]);

const SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";

const ASLEEP_VALUES = new Set([
  "HKCategoryValueSleepAnalysisAsleepUnspecified",
  "HKCategoryValueSleepAnalysisAsleepCore",
  "HKCategoryValueSleepAnalysisAsleepDeep",
  "HKCategoryValueSleepAnalysisAsleepREM",
]);

export const AGGREGATION_MAP: Record<string, "avg" | "sum" | "duration"> = {};
for (const t of SUM_TYPES) AGGREGATION_MAP[t] = "sum";
AGGREGATION_MAP[SLEEP_TYPE] = "duration";

// -- Helpers --

export function deriveMetricKey(type: string): string {
  const stripped = type
    .replace("HKQuantityTypeIdentifier", "")
    .replace("HKCategoryTypeIdentifier", "");
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function deriveLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function parseDurationHours(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

// -- Aggregation --

export function aggregateRecords(records: RawRecord[]) {
  const buckets = new Map<string, Map<string, DayBucket>>();
  const metricMeta = new Map<
    string,
    { type: string; unit: string; key: string }
  >();

  for (const r of records) {
    const key = deriveMetricKey(r.type);
    const date = parseDate(r.startDate);
    const aggregation = AGGREGATION_MAP[r.type] ?? "avg";

    if (!metricMeta.has(key)) {
      metricMeta.set(key, { type: r.type, unit: r.unit, key });
    }

    let value: number;
    if (aggregation === "duration") {
      if (!ASLEEP_VALUES.has(r.value)) continue;
      value = parseDurationHours(r.startDate, r.endDate);
    } else {
      value = parseFloat(r.value);
      if (!isFinite(value)) continue;
    }

    if (!buckets.has(key)) buckets.set(key, new Map());
    const dayMap = buckets.get(key)!;
    const bucket = dayMap.get(date) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    dayMap.set(date, bucket);
  }

  const metrics: { date: string; metric: string; value: number; unit: string }[] = [];
  const configs: {
    metric: string;
    label: string;
    unit: string;
    aggregation: string;
  }[] = [];

  for (const [key, dayMap] of buckets) {
    const meta = metricMeta.get(key)!;
    const aggregation = AGGREGATION_MAP[meta.type] ?? "avg";

    configs.push({
      metric: key,
      label: deriveLabel(key),
      unit: aggregation === "duration" ? "hr" : meta.unit,
      aggregation,
    });

    for (const [date, bucket] of dayMap) {
      const value =
        aggregation === "avg"
          ? Math.round((bucket.sum / bucket.count) * 100) / 100
          : Math.round(bucket.sum * 100) / 100;
      metrics.push({ date, metric: key, value, unit: aggregation === "duration" ? "hr" : meta.unit });
    }
  }

  metrics.sort((a, b) => a.date.localeCompare(b.date));
  configs.sort((a, b) => a.label.localeCompare(b.label));

  return { metrics, configs };
}

// -- XML line parsing --

const RECORD_RE =
  /<Record\s+type="([^"]+)"[^>]*startDate="([^"]+)"[^>]*endDate="([^"]+)"[^>]*(?:value="([^"]*)")?[^>]*unit="([^"]*)"[^/]*\/>/;

const RECORD_RE_ALT =
  /<Record\s+type="([^"]+)"[^>]*startDate="([^"]+)"[^>]*endDate="([^"]+)"[^>]*value="([^"]*)"[^/]*\/>/;

export function parseRecordLine(line: string): RawRecord | null {
  const match = RECORD_RE.exec(line) ?? RECORD_RE_ALT.exec(line);
  if (!match) return null;
  return {
    type: match[1],
    startDate: match[2],
    endDate: match[3],
    value: match[4] ?? "",
    unit: match[5] ?? "",
  };
}

// -- CLI --

async function main() {
  const inputPath = process.argv[2];
  const outputFlag = process.argv.indexOf("-o");
  const outputPath =
    outputFlag !== -1 ? process.argv[outputFlag + 1] : "health-data.json";

  if (!inputPath) {
    console.error(
      "Usage: bun run scripts/parse-health-export.ts <export.xml> [-o output.json]",
    );
    process.exit(1);
  }

  console.error(`Parsing ${inputPath}...`);

  const records: RawRecord[] = [];
  const rl = createInterface({ input: createReadStream(inputPath) });

  for await (const line of rl) {
    const record = parseRecordLine(line);
    if (record) records.push(record);
  }

  console.error(`Found ${records.length} records`);

  const result = aggregateRecords(records);

  console.error(
    `Output: ${result.metrics.length} daily values, ${result.configs.length} metric types`,
  );

  await Bun.write(outputPath, JSON.stringify(result, null, 2));
  console.error(`Written to ${outputPath}`);
}

// Only run main when executed directly (not imported in tests)
if (import.meta.main) {
  main();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test scripts/parse-health-export.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-health-export.ts scripts/parse-health-export.test.ts
git commit -m "feat: add CLI script to parse Apple Health XML exports"
```

---

### Task 7: Cleanup and Full Verification

**Files:**
- Modify: `specs/architecture.md`

- [ ] **Step 1: Run the full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 2: Update specs/architecture.md**

Update the architecture spec to reflect:
- New CLI script `scripts/parse-health-export.ts`
- New API endpoints: `POST /api/health-import`, `PATCH /api/health-config`, `GET /api/health-config`
- Removed: `POST /api/health-metrics`, `HEALTH_API_TOKEN` env var
- New table: `health_metric_config`
- New admin tab: `/admin/health`
- Dynamic dashboard rendering from config

- [ ] **Step 3: Run full validation**

Run: `bun run check:full`
Expected: All pass including build.

- [ ] **Step 4: Commit**

```bash
git add specs/architecture.md
git commit -m "docs: update architecture spec for health import changes"
```

---

### Task 8: Deploy Schema Changes

- [ ] **Step 1: Run D1 migration on remote**

```bash
bunx wrangler d1 execute bloodwork-db --remote --file=db/schema.sql
```

This is safe because the schema uses `CREATE TABLE IF NOT EXISTS` — the new `health_metric_config` table gets created, existing tables are untouched.

- [ ] **Step 2: Remove old secret**

```bash
bunx wrangler secret delete HEALTH_API_TOKEN
```

- [ ] **Step 3: Deploy**

```bash
bun run deploy
```

- [ ] **Step 4: Verify**

Visit `bloodwork.mareknevole.com/admin/health` and confirm the Health tab loads with empty state (no configs yet, so just the drop zone).
