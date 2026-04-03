# Apple Health Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import daily health metrics from Apple Health via iOS Shortcut and display them as a grid of time-series charts on the public dashboard.

**Architecture:** New `health_metrics` D1 table with `(date, metric)` composite PK. Bearer token auth for the Shortcut to POST daily batches. Client-side `HealthGrid` component renders 6 Recharts `LineChart` cards with linear regression trend lines.

**Tech Stack:** Next.js App Router, D1, Recharts, Vitest + Testing Library

---

### Task 1: Types and Constants

**Files:**
- Create: `types/health.ts`

- [ ] **Step 1: Create types/health.ts**

```ts
export const HEALTH_METRIC_KEYS = [
  "weight",
  "resting_hr",
  "hrv",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "sleep_duration",
  "vo2_max",
] as const;

export type HealthMetricKey = (typeof HEALTH_METRIC_KEYS)[number];

export type HealthMetric = {
  date: string;
  metric: HealthMetricKey;
  value: number;
  unit: string;
};

export type HealthMetricsRequest = {
  date: string;
  metrics: { metric: string; value: number; unit: string }[];
};
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS — types only, no runtime usage yet.

- [ ] **Step 3: Commit**

```bash
git add types/health.ts
git commit -m "feat: add health metric types and constants"
```

---

### Task 2: Database Schema

**Files:**
- Modify: `db/schema.sql`

- [ ] **Step 1: Add health_metrics table to schema.sql**

Append to the end of `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS health_metrics (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (date, metric)
);
```

- [ ] **Step 2: Run the migration on the remote D1 database**

```bash
bunx wrangler d1 execute bloodwork-db --remote --file=db/schema.sql
```

Expected: Success — the existing tables already have `IF NOT EXISTS`, so only the new table is created.

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add health_metrics table to D1 schema"
```

---

### Task 3: Database Query Function

**Files:**
- Modify: `db/queries.ts`

- [ ] **Step 1: Add the query function**

Add this import at the top of `db/queries.ts`:

```ts
import type { HealthMetric } from "@/types/health";
```

Add a row type alongside the other row types:

```ts
type HealthMetricRow = {
  date: string;
  metric: string;
  value: number;
  unit: string;
};
```

Add this function at the end of the file:

```ts
export async function getHealthMetrics(
  db: D1Database,
): Promise<HealthMetric[]> {
  const { results } = await db
    .prepare(
      "SELECT date, metric, value, unit FROM health_metrics ORDER BY date",
    )
    .all<HealthMetricRow>();
  return results as HealthMetric[];
}
```

Note: No row mapper needed — the column names match the type directly. The cast is safe because the DB only stores valid metric keys (enforced at the API layer).

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add db/queries.ts
git commit -m "feat: add getHealthMetrics query function"
```

---

### Task 4: Middleware — Bearer Token Auth

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Extend middleware to accept bearer token for health-metrics endpoint**

Replace the entire contents of `middleware.ts` with:

```ts
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip the login page itself and the auth API
  if (pathname === "/admin" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Health metrics API accepts bearer token OR session cookie
  if (pathname.startsWith("/api/health-metrics")) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      if (token && token === process.env.HEALTH_API_TOKEN) {
        return NextResponse.next();
      }
    }
    // Fall through to session cookie check below
  }

  const session = req.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path+",
    "/api/extract/:path*",
    "/api/map/:path*",
    "/api/readings/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
    "/api/changelog/:path*",
    "/api/health-metrics/:path*",
  ],
};
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add bearer token auth for health-metrics endpoint"
```

---

### Task 5: API Route

**Files:**
- Create: `app/api/health-metrics/route.ts`

- [ ] **Step 1: Create the POST handler**

```ts
import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HEALTH_METRIC_KEYS } from "@/types/health";
import type { HealthMetricsRequest } from "@/types/health";

const VALID_KEYS = new Set<string>(HEALTH_METRIC_KEYS);

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await request.json()) as HealthMetricsRequest;

  assert(typeof body.date === "string" && body.date.length > 0, "Missing date");
  assert(!isNaN(Date.parse(body.date)), "Invalid date");
  assert(Array.isArray(body.metrics) && body.metrics.length > 0, "Missing metrics");

  for (const m of body.metrics) {
    assert(VALID_KEYS.has(m.metric), `Unknown metric: ${m.metric}`);
    assert(typeof m.value === "number" && isFinite(m.value), `Invalid value for ${m.metric}`);
    assert(typeof m.unit === "string" && m.unit.length > 0, `Missing unit for ${m.metric}`);
  }

  const statements = body.metrics.map((m) =>
    db
      .prepare(
        "INSERT OR REPLACE INTO health_metrics (date, metric, value, unit) VALUES (?, ?, ?, ?)",
      )
      .bind(body.date, m.metric, m.value, m.unit),
  );

  await db.batch(statements);

  return Response.json({ saved: body.metrics.length });
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/health-metrics/route.ts
git commit -m "feat: add POST /api/health-metrics endpoint"
```

---

### Task 6: Linear Regression Utility

**Files:**
- Create: `lib/linear-regression.ts`
- Create: `lib/linear-regression.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/linear-regression.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { linearRegression } from "@/lib/linear-regression";

describe("linearRegression", () => {
  it("returns a flat line for constant values", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(0);
    expect(result.intercept).toBeCloseTo(5);
  });

  it("returns correct slope for a perfect line", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(0);
  });

  it("returns zero slope for a single point", () => {
    const result = linearRegression([{ x: 3, y: 7 }]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(7);
  });

  it("returns zero slope for empty input", () => {
    const result = linearRegression([]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- lib/linear-regression.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/linear-regression.ts`:

```ts
type Point = { x: number; y: number };

export function linearRegression(points: Point[]): {
  slope: number;
  intercept: number;
} {
  if (points.length === 0) return { slope: 0, intercept: 0 };
  if (points.length === 1) return { slope: 0, intercept: points[0].y };

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- lib/linear-regression.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/linear-regression.ts lib/linear-regression.test.ts
git commit -m "feat: add linear regression utility with tests"
```

---

### Task 7: Health Chart Component

**Files:**
- Create: `components/dashboard/health-chart.tsx`
- Create: `components/dashboard/health-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/health-chart.test.tsx`:

```tsx
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
    render(
      <HealthChart label="Resting HR" unit="bpm" data={sampleData} />,
    );
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("bpm")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/health-chart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/health-chart.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { linearRegression } from "@/lib/linear-regression";
import type { HealthMetric } from "@/types/health";

export function HealthChart({
  label,
  unit,
  data,
}: {
  label: string;
  unit: string;
  data: HealthMetric[];
}) {
  const latest = data.at(-1);

  const chartData = useMemo(() => {
    const reg = linearRegression(
      data.map((d, i) => ({ x: i, y: d.value })),
    );
    return data.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: d.value,
      trend: reg.slope * i + reg.intercept,
    }));
  }, [data]);

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] tracking-widest text-zinc-400 uppercase">
          {label}
        </span>
        {latest && (
          <span>
            <span className="text-lg font-bold">{latest.value}</span>
            <span className="ml-1 text-xs text-zinc-500">{unit}</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              border: "1px solid #e4e4e7",
              borderRadius: 0,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke="#18181b"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/health-chart.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/health-chart.tsx components/dashboard/health-chart.test.tsx
git commit -m "feat: add HealthChart component with trend line"
```

---

### Task 8: Blood Pressure Chart Component

**Files:**
- Create: `components/dashboard/blood-pressure-chart.tsx`
- Create: `components/dashboard/blood-pressure-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/blood-pressure-chart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import type { HealthMetric } from "@/types/health";

const systolic: HealthMetric[] = [
  { date: "2026-03-01", metric: "blood_pressure_systolic", value: 120, unit: "mmHg" },
  { date: "2026-03-15", metric: "blood_pressure_systolic", value: 118, unit: "mmHg" },
];
const diastolic: HealthMetric[] = [
  { date: "2026-03-01", metric: "blood_pressure_diastolic", value: 80, unit: "mmHg" },
  { date: "2026-03-15", metric: "blood_pressure_diastolic", value: 78, unit: "mmHg" },
];

describe("BloodPressureChart", () => {
  it("renders label and combined latest value", () => {
    render(
      <BloodPressureChart systolic={systolic} diastolic={diastolic} />,
    );
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("118/78")).toBeInTheDocument();
    expect(screen.getByText("mmHg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/blood-pressure-chart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/blood-pressure-chart.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { linearRegression } from "@/lib/linear-regression";
import type { HealthMetric } from "@/types/health";

export function BloodPressureChart({
  systolic,
  diastolic,
}: {
  systolic: HealthMetric[];
  diastolic: HealthMetric[];
}) {
  const latestSys = systolic.at(-1);
  const latestDia = diastolic.at(-1);

  const chartData = useMemo(() => {
    const sysReg = linearRegression(
      systolic.map((d, i) => ({ x: i, y: d.value })),
    );
    const diaReg = linearRegression(
      diastolic.map((d, i) => ({ x: i, y: d.value })),
    );
    const diaMap = new Map(diastolic.map((d) => [d.date, d.value]));

    return systolic.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      systolic: d.value,
      diastolic: diaMap.get(d.date) ?? null,
      sysTrend: sysReg.slope * i + sysReg.intercept,
      diaTrend: diaReg.slope * i + diaReg.intercept,
    }));
  }, [systolic, diastolic]);

  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] tracking-widest text-zinc-400 uppercase">
          Blood Pressure
        </span>
        {latestSys && latestDia && (
          <span>
            <span className="text-lg font-bold">
              {latestSys.value}/{latestDia.value}
            </span>
            <span className="ml-1 text-xs text-zinc-500">mmHg</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={["dataMin - 5", "dataMax + 5"]}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 11,
              border: "1px solid #e4e4e7",
              borderRadius: 0,
            }}
          />
          <Line
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            stroke="#18181b"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#18181b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 2.5, fill: "#18181b" }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="sysTrend"
            name="Sys Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="diaTrend"
            name="Dia Trend"
            stroke="#a1a1aa"
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/blood-pressure-chart.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/blood-pressure-chart.tsx components/dashboard/blood-pressure-chart.test.tsx
git commit -m "feat: add BloodPressureChart component"
```

---

### Task 9: Health Grid Component

**Files:**
- Create: `components/dashboard/health-grid.tsx`
- Create: `components/dashboard/health-grid.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/dashboard/health-grid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthGrid } from "@/components/dashboard/health-grid";
import type { HealthMetric } from "@/types/health";

const metrics: HealthMetric[] = [
  { date: "2026-03-01", metric: "weight", value: 82, unit: "kg" },
  { date: "2026-03-01", metric: "resting_hr", value: 58, unit: "bpm" },
  { date: "2026-03-01", metric: "hrv", value: 42, unit: "ms" },
  { date: "2026-03-01", metric: "blood_pressure_systolic", value: 120, unit: "mmHg" },
  { date: "2026-03-01", metric: "blood_pressure_diastolic", value: 80, unit: "mmHg" },
  { date: "2026-03-01", metric: "sleep_duration", value: 7.3, unit: "hr" },
  { date: "2026-03-01", metric: "vo2_max", value: 45, unit: "mL/kg/min" },
];

describe("HealthGrid", () => {
  it("renders period selector buttons", () => {
    render(<HealthGrid metrics={metrics} />);
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("6M")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
  });

  it("renders all metric labels", () => {
    render(<HealthGrid metrics={metrics} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Resting HR")).toBeInTheDocument();
    expect(screen.getByText("HRV")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
    expect(screen.getByText("Sleep")).toBeInTheDocument();
    expect(screen.getByText("VO2 Max")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- components/dashboard/health-grid.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/dashboard/health-grid.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { BloodPressureChart } from "@/components/dashboard/blood-pressure-chart";
import { HealthChart } from "@/components/dashboard/health-chart";
import type { HealthMetric, HealthMetricKey } from "@/types/health";

type Period = "1M" | "6M" | "1Y";

const PERIODS: Period[] = ["1M", "6M", "1Y"];

const PERIOD_MONTHS: Record<Period, number> = {
  "1M": 1,
  "6M": 6,
  "1Y": 12,
};

type ChartConfig =
  | { type: "single"; key: HealthMetricKey; label: string; unit: string }
  | { type: "blood_pressure" };

const CHARTS: ChartConfig[] = [
  { type: "single", key: "weight", label: "Weight", unit: "kg" },
  { type: "single", key: "resting_hr", label: "Resting HR", unit: "bpm" },
  { type: "single", key: "hrv", label: "HRV", unit: "ms" },
  { type: "blood_pressure" },
  { type: "single", key: "sleep_duration", label: "Sleep", unit: "hr" },
  { type: "single", key: "vo2_max", label: "VO2 Max", unit: "mL/kg/min" },
];

function filterByPeriod(
  data: HealthMetric[],
  period: Period,
): HealthMetric[] {
  const now = new Date();
  const cutoff = new Date(
    now.getFullYear(),
    now.getMonth() - PERIOD_MONTHS[period],
    now.getDate(),
  );
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export function HealthGrid({ metrics }: { metrics: HealthMetric[] }) {
  const [period, setPeriod] = useState<Period>("6M");

  const filtered = useMemo(
    () => filterByPeriod(metrics, period),
    [metrics, period],
  );

  const byMetric = useMemo(() => {
    const map = new Map<HealthMetricKey, HealthMetric[]>();
    for (const m of filtered) {
      const list = map.get(m.metric) ?? [];
      list.push(m);
      map.set(m.metric, list);
    }
    return map;
  }, [filtered]);

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
        {CHARTS.map((chart) => {
          if (chart.type === "blood_pressure") {
            return (
              <BloodPressureChart
                key="blood_pressure"
                systolic={byMetric.get("blood_pressure_systolic") ?? []}
                diastolic={byMetric.get("blood_pressure_diastolic") ?? []}
              />
            );
          }
          return (
            <HealthChart
              key={chart.key}
              label={chart.label}
              unit={chart.unit}
              data={byMetric.get(chart.key) ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- components/dashboard/health-grid.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/health-grid.tsx components/dashboard/health-grid.test.tsx
git commit -m "feat: add HealthGrid component with period selector"
```

---

### Task 10: Wire Up Dashboard

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/dashboard/section-nav.tsx`

- [ ] **Step 1: Add "Health" to section nav**

In `components/dashboard/section-nav.tsx`, update the `SECTIONS` array:

```ts
const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "trends", label: "Trends" },
  { id: "health", label: "Health" },
  { id: "supplements", label: "Supplements" },
  { id: "changelog", label: "Changelog" },
] as const;
```

- [ ] **Step 2: Add Health section to page.tsx**

In `app/page.tsx`, add the import at the top:

```ts
import { HealthGrid } from "@/components/dashboard/health-grid";
import { getHealthMetrics } from "@/db/queries";
```

Add the query alongside the other queries in the `Home` function:

```ts
const healthMetrics = await getHealthMetrics(db);
```

Add the Health section between the existing `#trends` section and the `#supplements` section:

```tsx
<section id="health" className="mb-8">
  <h2 className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
    Health
  </h2>
  <HealthGrid metrics={healthMetrics} />
</section>
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/dashboard/section-nav.tsx
git commit -m "feat: add Health section to dashboard"
```

---

### Task 11: Public Data API

**Files:**
- Modify: `app/api/data/route.ts`

- [ ] **Step 1: Include health metrics in the public data response**

In `app/api/data/route.ts`, add the import:

```ts
import { getHealthMetrics } from "@/db/queries";
```

Add the query:

```ts
const healthMetrics = await getHealthMetrics(db);
```

Add `healthMetrics` to the response:

```ts
return Response.json({
  vocabulary: { entries: vocabulary },
  readings: readings.map((r) => ({
    date: r.date,
    source: r.source,
    measurements: r.measurements,
  })),
  healthMetrics,
});
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/data/route.ts
git commit -m "feat: include health metrics in public data API"
```

---

### Task 12: Update Specs

**Files:**
- Modify: `specs/architecture.md`

- [ ] **Step 1: Update architecture.md**

Add to the Route Structure table (no new route, but the API table needs updating). In the API Routes table, add:

```
| POST   | `/api/health-metrics` | Upsert daily health metrics (bearer token or session) |
```

Update the Data section to mention the new table:

```
D1 SQLite database with tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`, `health_metrics`.
```

Add to Component Architecture under `components/dashboard/`:

```
  - `health-grid` — health metrics grid with period selector
  - `health-chart` — individual metric time-series with trend line
  - `blood-pressure-chart` — combined systolic/diastolic chart
```

Add to Environment Variables:

```
- `HEALTH_API_TOKEN` — bearer token for iOS Shortcut health metrics sync
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add specs/architecture.md
git commit -m "docs: update architecture spec with health metrics"
```

---

### Task 13: Set Cloudflare Secret and Full Validation

- [ ] **Step 1: Set the HEALTH_API_TOKEN secret**

Generate a random token and set it:

```bash
openssl rand -base64 32 | bunx wrangler secret put HEALTH_API_TOKEN
```

Save the token value — you'll need it for the iOS Shortcut.

- [ ] **Step 2: Run full validation**

Run: `bun run check:full`
Expected: PASS — all checks green, production build succeeds.

- [ ] **Step 3: Deploy**

Run: `bun run deploy`
Expected: Successful deployment to Cloudflare Workers.

- [ ] **Step 4: Run remote D1 migration**

```bash
bunx wrangler d1 execute bloodwork-db --remote --file=db/schema.sql
```

Note: This was already done in Task 2, but re-running is safe due to `IF NOT EXISTS`.

- [ ] **Step 5: Verify the endpoint works**

```bash
curl -X POST https://bloodwork.mareknevole.com/api/health-metrics \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-03","metrics":[{"metric":"weight","value":82.5,"unit":"kg"}]}'
```

Expected: `{"saved":1}`
