# Apple Health XML Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS Shortcut health metrics endpoint with a browser-based Apple Health XML import in the admin panel, with per-metric dashboard visibility toggles.

**Architecture:** Client-side SAX streaming parse of `export.xml` → daily aggregation → POST to new `/api/health-import` endpoint → D1. Separate `health_metric_config` table controls dashboard visibility. Admin Health tab has drop zone + toggleable chips. Dashboard renders visible metrics dynamically.

**Tech Stack:** Next.js App Router, D1 SQLite, TypeScript, Tailwind CSS, Vitest + Testing Library, SAX parser (browser `DOMParser` with chunked string splitting)

---

### Task 1: Update types and schema

**Files:**

- Modify: `types/health.ts`
- Modify: `db/schema.sql`

- [ ] **Step 1: Replace `types/health.ts` with new types**

Remove the hardcoded `HEALTH_METRIC_KEYS` and `HealthMetricsRequest`. Replace with dynamic types:

```ts
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

- [ ] **Step 2: Update `db/schema.sql`**

Replace the `health_metrics` table definition and add `health_metric_config`:

```sql
CREATE TABLE IF NOT EXISTS health_metrics (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  PRIMARY KEY (date, metric)
);

CREATE TABLE IF NOT EXISTS health_metric_config (
  metric TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 0
);
```

Note: the `health_metrics` table schema is unchanged — only the code that writes to it changes. The `health_metric_config` table is new.

- [ ] **Step 3: Run the new schema on the remote D1 database**

```bash
bunx wrangler d1 execute bloodwork-db --remote --command="CREATE TABLE IF NOT EXISTS health_metric_config (metric TEXT PRIMARY KEY, label TEXT NOT NULL, unit TEXT NOT NULL, aggregation TEXT NOT NULL, visible INTEGER NOT NULL DEFAULT 0);"
```

- [ ] **Step 4: Commit**

```bash
git add types/health.ts db/schema.sql
git commit -m "refactor: replace hardcoded health metric types with dynamic schema"
```

---

### Task 2: Update database queries

**Files:**

- Modify: `db/queries.ts`
- Modify: `db/queries.test.ts`

- [ ] **Step 1: Write tests for new query mapper functions**

Add to `db/queries.test.ts`:

```ts
import { mapHealthMetricConfigRow } from "@/db/queries";

// ... existing tests ...

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

it("maps health metric config row with visible=0", () => {
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

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test -- db/queries.test.ts
```

Expected: FAIL — `mapHealthMetricConfigRow` is not exported.

- [ ] **Step 3: Update `db/queries.ts`**

Remove the import of `HEALTH_METRIC_KEYS` and the `HealthMetricKey` type. Remove the `getHealthMetrics` function that asserts against the hardcoded key set.

Add new row type, mapper, and query functions:

```ts
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

type HealthMetricConfigRow = {
  metric: string;
  label: string;
  unit: string;
  aggregation: string;
  visible: number;
};

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

export async function getVisibleHealthMetrics(
  db: D1Database,
): Promise<HealthMetric[]> {
  const { results } = await db
    .prepare(
      `SELECT hm.date, hm.metric, hm.value, hm.unit
       FROM health_metrics hm
       JOIN health_metric_config hmc ON hm.metric = hmc.metric
       WHERE hmc.visible = 1
       ORDER BY hm.date`,
    )
    .all<HealthMetricRow>();
  return results;
}
```

Keep the existing `HealthMetricRow` type (it's unchanged). Remove the old `getHealthMetrics` function entirely.

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test -- db/queries.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add db/queries.ts db/queries.test.ts
git commit -m "refactor: replace hardcoded health metric queries with dynamic config-based queries"
```

---

### Task 3: Apple Health XML parser

**Files:**

- Create: `lib/apple-health-parser.ts`
- Create: `lib/apple-health-parser.test.ts`

- [ ] **Step 1: Write tests for the parser**

Create `lib/apple-health-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  type ParseResult,
  deriveMetricKey,
  getAggregationType,
  getMetricLabel,
  parseAppleHealthXml,
} from "@/lib/apple-health-parser";

describe("deriveMetricKey", () => {
  it("converts HKQuantityTypeIdentifier to snake_case", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierHeartRate")).toBe(
      "heart_rate",
    );
  });

  it("converts HKCategoryTypeIdentifier to snake_case", () => {
    expect(deriveMetricKey("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
      "sleep_analysis",
    );
  });

  it("handles multi-word identifiers", () => {
    expect(deriveMetricKey("HKQuantityTypeIdentifierRestingHeartRate")).toBe(
      "resting_heart_rate",
    );
  });
});

describe("getAggregationType", () => {
  it("returns sum for step count", () => {
    expect(getAggregationType("HKQuantityTypeIdentifierStepCount")).toBe("sum");
  });

  it("returns avg for heart rate", () => {
    expect(getAggregationType("HKQuantityTypeIdentifierHeartRate")).toBe("avg");
  });

  it("returns duration for sleep analysis", () => {
    expect(getAggregationType("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
      "duration",
    );
  });

  it("defaults to avg for unknown types", () => {
    expect(getAggregationType("HKQuantityTypeIdentifierUnknownThing")).toBe(
      "avg",
    );
  });
});

describe("getMetricLabel", () => {
  it("converts snake_case key to title case", () => {
    expect(getMetricLabel("heart_rate")).toBe("Heart Rate");
  });

  it("handles single word", () => {
    expect(getMetricLabel("steps")).toBe("Steps");
  });
});

describe("parseAppleHealthXml", () => {
  it("aggregates avg metrics by day", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-04-01 08:00:00 +0000" endDate="2026-04-01 08:01:00 +0000" value="60" unit="count/min"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-04-01 12:00:00 +0000" endDate="2026-04-01 12:01:00 +0000" value="80" unit="count/min"/>
</HealthData>`;
    const result = await parseAppleHealthXml(xml);
    expect(result.metrics).toEqual([
      {
        date: "2026-04-01",
        metric: "heart_rate",
        value: 70,
        unit: "count/min",
      },
    ]);
    expect(result.configs).toContainEqual({
      metric: "heart_rate",
      label: "Heart Rate",
      unit: "count/min",
      aggregation: "avg",
    });
  });

  it("aggregates sum metrics by day", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-04-01 08:00:00 +0000" endDate="2026-04-01 09:00:00 +0000" value="3000" unit="count"/>
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-04-01 12:00:00 +0000" endDate="2026-04-01 13:00:00 +0000" value="5000" unit="count"/>
</HealthData>`;
    const result = await parseAppleHealthXml(xml);
    expect(result.metrics).toEqual([
      { date: "2026-04-01", metric: "step_count", value: 8000, unit: "count" },
    ]);
  });

  it("aggregates sleep duration from time intervals", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-04-01 23:00:00 +0000" endDate="2026-04-02 02:00:00 +0000" value="HKCategoryValueSleepAnalysisAsleepUnspecified"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-04-02 03:00:00 +0000" endDate="2026-04-02 06:30:00 +0000" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
</HealthData>`;
    const result = await parseAppleHealthXml(xml);
    // Sleep is summed per start date: 3h for Apr 1, 3.5h for Apr 2
    const apr1 = result.metrics.find(
      (m) => m.date === "2026-04-01" && m.metric === "sleep_analysis",
    );
    const apr2 = result.metrics.find(
      (m) => m.date === "2026-04-02" && m.metric === "sleep_analysis",
    );
    expect(apr1?.value).toBeCloseTo(3);
    expect(apr2?.value).toBeCloseTo(3.5);
    expect(apr1?.unit).toBe("hr");
  });

  it("skips non-asleep sleep records", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-04-01 22:00:00 +0000" endDate="2026-04-01 22:30:00 +0000" value="HKCategoryValueSleepAnalysisInBed"/>
</HealthData>`;
    const result = await parseAppleHealthXml(xml);
    expect(result.metrics).toEqual([]);
  });

  it("handles multiple metric types across multiple days", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-04-01 08:00:00 +0000" endDate="2026-04-01 08:01:00 +0000" value="60" unit="count/min"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-04-02 08:00:00 +0000" endDate="2026-04-02 08:01:00 +0000" value="65" unit="count/min"/>
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-04-01 08:00:00 +0000" endDate="2026-04-01 09:00:00 +0000" value="5000" unit="count"/>
</HealthData>`;
    const result = await parseAppleHealthXml(xml);
    expect(result.metrics).toHaveLength(3);
    expect(result.configs).toHaveLength(2);
  });

  it("reports progress via callback", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-04-01 08:00:00 +0000" endDate="2026-04-01 08:01:00 +0000" value="60" unit="count/min"/>
</HealthData>`;
    const updates: number[] = [];
    await parseAppleHealthXml(xml, (progress) =>
      updates.push(progress.percent),
    );
    expect(updates.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test -- lib/apple-health-parser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

Create `lib/apple-health-parser.ts`:

```ts
type Aggregation = "avg" | "sum" | "duration";

type Accumulator = { sum: number; count: number };

export type ParseProgress = {
  percent: number;
  metricTypes: number;
  days: number;
  records: number;
};

export type ParseResult = {
  metrics: { date: string; metric: string; value: number; unit: string }[];
  configs: {
    metric: string;
    label: string;
    unit: string;
    aggregation: Aggregation;
  }[];
};

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
  "HKCategoryValueSleepAnalysisAsleep",
]);

export function deriveMetricKey(type: string): string {
  const stripped = type
    .replace("HKQuantityTypeIdentifier", "")
    .replace("HKCategoryTypeIdentifier", "");
  return stripped.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function getAggregationType(type: string): Aggregation {
  if (type === SLEEP_TYPE) return "duration";
  if (SUM_TYPES.has(type)) return "sum";
  return "avg";
}

export function getMetricLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function parseDurationHours(startDate: string, endDate: string): number {
  const start = new Date(startDate.replace(" +", "+").replace(" -", "-"));
  const end = new Date(endDate.replace(" +", "+").replace(" -", "-"));
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function parseAppleHealthXml(
  xmlString: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  // Map<metric, Map<date, Accumulator>>
  const data = new Map<string, Map<string, Accumulator>>();
  const metricUnits = new Map<string, string>();
  const metricTypes = new Map<string, string>(); // metric key -> HK type

  const recordRegex = /<Record\s+([^>]*?)\/?>/g;
  const attrRegex = /(\w+)="([^"]*)"/g;

  let recordCount = 0;
  const totalEstimate = (xmlString.match(/<Record /g) || []).length;

  let match: RegExpExecArray | null;
  while ((match = recordRegex.exec(xmlString)) !== null) {
    const attrString = match[1];
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const type = attrs.type;
    const startDate = attrs.startDate;
    if (!type || !startDate) continue;

    const metricKey = deriveMetricKey(type);
    const aggregation = getAggregationType(type);
    const date = extractDate(startDate);

    if (aggregation === "duration") {
      const endDate = attrs.endDate;
      const value = attrs.value;
      if (!endDate || !value || !ASLEEP_VALUES.has(value)) continue;

      const hours = parseDurationHours(startDate, endDate);
      if (!data.has(metricKey)) data.set(metricKey, new Map());
      const dayMap = data.get(metricKey)!;
      const acc = dayMap.get(date) ?? { sum: 0, count: 0 };
      acc.sum += hours;
      acc.count += 1;
      dayMap.set(date, acc);
      metricUnits.set(metricKey, "hr");
      metricTypes.set(metricKey, type);
    } else {
      const numValue = Number(attrs.value);
      if (!isFinite(numValue)) continue;

      if (!data.has(metricKey)) data.set(metricKey, new Map());
      const dayMap = data.get(metricKey)!;
      const acc = dayMap.get(date) ?? { sum: 0, count: 0 };
      acc.sum += numValue;
      acc.count += 1;
      dayMap.set(date, acc);
      if (attrs.unit) metricUnits.set(metricKey, attrs.unit);
      metricTypes.set(metricKey, type);
    }

    recordCount++;
    if (onProgress && recordCount % 10000 === 0) {
      const days = new Set([...data.values()].flatMap((m) => [...m.keys()]))
        .size;
      onProgress({
        percent:
          totalEstimate > 0
            ? Math.round((recordCount / totalEstimate) * 100)
            : 0,
        metricTypes: data.size,
        days,
        records: recordCount,
      });
    }
  }

  // Build results
  const metrics: ParseResult["metrics"] = [];
  const configs: ParseResult["configs"] = [];

  for (const [metricKey, dayMap] of data) {
    const type = metricTypes.get(metricKey)!;
    const aggregation = getAggregationType(type);
    const unit = metricUnits.get(metricKey) ?? "";

    configs.push({
      metric: metricKey,
      label: getMetricLabel(metricKey),
      unit,
      aggregation,
    });

    for (const [date, acc] of dayMap) {
      const value =
        aggregation === "sum" || aggregation === "duration"
          ? acc.sum
          : acc.sum / acc.count;
      metrics.push({
        date,
        metric: metricKey,
        value: Math.round(value * 100) / 100,
        unit,
      });
    }
  }

  // Sort metrics by date then metric key
  metrics.sort(
    (a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric),
  );

  // Final progress
  if (onProgress) {
    const days = new Set(metrics.map((m) => m.date)).size;
    onProgress({
      percent: 100,
      metricTypes: configs.length,
      days,
      records: recordCount,
    });
  }

  return { metrics, configs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test -- lib/apple-health-parser.test.ts
```

Expected: PASS

- [ ] **Step 5: Run full check**

```bash
bun run check
```

Expected: PASS — no type errors (the old `HEALTH_METRIC_KEYS` import in `db/queries.ts` was already removed in Task 2).

- [ ] **Step 6: Commit**

```bash
git add lib/apple-health-parser.ts lib/apple-health-parser.test.ts
git commit -m "feat: add Apple Health XML parser with streaming regex and daily aggregation"
```

---

### Task 4: API endpoint — health import

**Files:**

- Create: `app/api/health-import/route.ts`
- Delete: `app/api/health-metrics/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Create `app/api/health-import/route.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { HealthImportRequest } from "@/types/health";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const body = (await request.json()) as HealthImportRequest;

  if (!Array.isArray(body.metrics) || body.metrics.length === 0) {
    return Response.json({ error: "No metrics provided" }, { status: 400 });
  }
  if (!Array.isArray(body.configs) || body.configs.length === 0) {
    return Response.json({ error: "No configs provided" }, { status: 400 });
  }

  const statements = [
    ...body.configs.map((c) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO health_metric_config (metric, label, unit, aggregation, visible) VALUES (?, ?, ?, ?, 0)",
        )
        .bind(c.metric, c.label, c.unit, c.aggregation),
    ),
    ...body.metrics.map((m) =>
      db
        .prepare(
          "INSERT OR REPLACE INTO health_metrics (date, metric, value, unit) VALUES (?, ?, ?, ?)",
        )
        .bind(m.date, m.metric, m.value, m.unit),
    ),
  ];

  await db.batch(statements);

  return Response.json({ saved: body.metrics.length });
}
```

- [ ] **Step 2: Delete the old health metrics endpoint**

```bash
rm app/api/health-metrics/route.ts
```

- [ ] **Step 3: Update `middleware.ts` matcher**

Replace the matcher array to add the new endpoints and remove the old one:

```ts
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

- [ ] **Step 4: Run check**

```bash
bun run check
```

Expected: PASS (may fail if other files still import from old health-metrics — fix any remaining imports in the next steps).

- [ ] **Step 5: Commit**

```bash
git add app/api/health-import/route.ts middleware.ts
git rm app/api/health-metrics/route.ts
git commit -m "feat: add health import API endpoint, remove iOS Shortcut endpoint"
```

---

### Task 5: API endpoint — health config (visibility toggle)

**Files:**

- Create: `app/api/health-config/route.ts`

- [ ] **Step 1: Create `app/api/health-config/route.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { HealthMetricConfig } from "@/types/health";

export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const { results } = await db
    .prepare(
      "SELECT metric, label, unit, aggregation, visible FROM health_metric_config ORDER BY label",
    )
    .all<{
      metric: string;
      label: string;
      unit: string;
      aggregation: string;
      visible: number;
    }>();

  const configs: HealthMetricConfig[] = results.map((r) => ({
    metric: r.metric,
    label: r.label,
    unit: r.unit,
    aggregation: r.aggregation as HealthMetricConfig["aggregation"],
    visible: r.visible === 1,
  }));

  return Response.json(configs);
}

export async function PATCH(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const body = (await request.json()) as {
    metric: string;
    visible: boolean;
  };

  if (typeof body.metric !== "string" || typeof body.visible !== "boolean") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  await db
    .prepare("UPDATE health_metric_config SET visible = ? WHERE metric = ?")
    .bind(body.visible ? 1 : 0, body.metric)
    .run();

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Run check**

```bash
bun run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/health-config/route.ts
git commit -m "feat: add health config API for visibility toggles"
```

---

### Task 6: Admin Health tab — page and import component

**Files:**

- Create: `app/admin/health/page.tsx`
- Create: `components/admin/health-import.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Add "Health" tab to admin nav**

In `app/admin/layout.tsx`, add to the `navItems` array:

```ts
const navItems = [
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/vocabulary", label: "Vocabulary" },
  { href: "/admin/supplements", label: "Supplements" },
  { href: "/admin/health", label: "Health" },
] as const;
```

- [ ] **Step 2: Create the import component**

Create `components/admin/health-import.tsx`:

```tsx
"use client";

import { useCallback, useRef, useState } from "react";

import {
  type ParseProgress,
  parseAppleHealthXml,
} from "@/lib/apple-health-parser";

type ImportState =
  | { status: "idle" }
  | { status: "parsing"; progress: ParseProgress }
  | { status: "uploading" }
  | { status: "done"; metricCount: number; dayCount: number }
  | { status: "error"; message: string };

export function HealthImport({
  onImportComplete,
}: {
  onImportComplete: () => void;
}) {
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setState({
        status: "parsing",
        progress: { percent: 0, metricTypes: 0, days: 0, records: 0 },
      });

      const text = await file.text();
      const result = await parseAppleHealthXml(text, (progress) => {
        setState({ status: "parsing", progress });
      });

      if (result.metrics.length === 0) {
        setState({
          status: "error",
          message: "No health records found in file",
        });
        return;
      }

      setState({ status: "uploading" });

      const res = await fetch("/api/health-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!res.ok) {
        const body = await res.json();
        setState({
          status: "error",
          message: body.error ?? "Upload failed",
        });
        return;
      }

      const days = new Set(result.metrics.map((m) => m.date)).size;
      setState({
        status: "done",
        metricCount: result.configs.length,
        dayCount: days,
      });
      onImportComplete();
    },
    [onImportComplete],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <h2 className="mb-3 text-[10px] tracking-[2px] text-zinc-400 uppercase">
        Import
      </h2>
      {state.status === "idle" ||
      state.status === "done" ||
      state.status === "error" ? (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-zinc-400 bg-zinc-50" : "border-zinc-200"
            }`}
          >
            <p className="text-sm text-zinc-500">Drop export.xml here</p>
            <p className="mt-1 text-[10px] text-zinc-400">
              or click to select file
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xml"
              onChange={onFileSelect}
              className="hidden"
            />
          </div>
          {state.status === "done" && (
            <p className="mt-2 text-[10px] text-zinc-500">
              Imported {state.metricCount} metrics, {state.dayCount} days
            </p>
          )}
          {state.status === "error" && (
            <p className="mt-2 text-[10px] text-red-500">{state.message}</p>
          )}
        </div>
      ) : state.status === "parsing" ? (
        <div className="border border-zinc-200 p-6">
          <div className="mb-2 flex justify-between text-[10px]">
            <span className="text-zinc-900">Parsing export.xml…</span>
            <span className="text-zinc-400">{state.progress.percent}%</span>
          </div>
          <div className="mb-3 h-1 w-full bg-zinc-100">
            <div
              className="h-1 bg-zinc-900 transition-all"
              style={{ width: `${state.progress.percent}%` }}
            />
          </div>
          <div className="flex gap-4 text-[10px] text-zinc-400">
            <span>{state.progress.metricTypes} metric types</span>
            <span>{state.progress.days} days</span>
            <span>{state.progress.records.toLocaleString()} records</span>
          </div>
        </div>
      ) : (
        <div className="border border-zinc-200 p-6">
          <p className="text-[10px] text-zinc-500">Uploading to database…</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the admin health page**

Create `app/admin/health/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { HealthImport } from "@/components/admin/health-import";
import type { HealthMetricConfig } from "@/types/health";

export default function AdminHealthPage() {
  const [configs, setConfigs] = useState<HealthMetricConfig[]>([]);

  const loadConfigs = useCallback(async () => {
    const res = await fetch("/api/health-config");
    if (res.ok) {
      setConfigs(await res.json());
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function toggleVisibility(metric: string, visible: boolean) {
    setConfigs((prev) =>
      prev.map((c) => (c.metric === metric ? { ...c, visible } : c)),
    );
    await fetch("/api/health-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric, visible }),
    });
  }

  const visibleCount = configs.filter((c) => c.visible).length;

  return (
    <div className="space-y-8">
      <HealthImport onImportComplete={loadConfigs} />

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[10px] tracking-[2px] text-zinc-400 uppercase">
            Dashboard visibility
          </h2>
          {configs.length > 0 && (
            <span className="text-[10px] text-zinc-400">
              {visibleCount} of {configs.length} shown
            </span>
          )}
        </div>
        {configs.length === 0 ? (
          <p className="text-[10px] text-zinc-400">
            No metrics imported yet. Drop an export.xml file above to get
            started.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {configs.map((c) => (
              <button
                key={c.metric}
                type="button"
                onClick={() => toggleVisibility(c.metric, !c.visible)}
                className={`border px-3 py-1.5 text-[11px] transition-colors ${
                  c.visible
                    ? "border-zinc-800 bg-zinc-800 text-white"
                    : "border-zinc-200 text-zinc-400 hover:border-zinc-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run check**

```bash
bun run check
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/admin/health/page.tsx components/admin/health-import.tsx app/admin/layout.tsx
git commit -m "feat: add admin Health tab with XML import and visibility toggles"
```

---

### Task 7: Update dashboard to use dynamic metrics

**Files:**

- Modify: `components/dashboard/health-grid.tsx`
- Modify: `components/dashboard/health-grid.test.tsx`
- Modify: `components/dashboard/health-chart.tsx`
- Modify: `components/dashboard/health-chart.test.tsx`
- Modify: `components/dashboard/blood-pressure-chart.test.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `HealthChart` to accept `string` metric type**

In `components/dashboard/health-chart.tsx`, change the import:

```ts
import type { HealthMetric } from "@/types/health";
```

This import stays the same — the `HealthMetric` type now uses `string` for `metric` instead of the old union type. No code changes needed in this file since it already uses `label` and `unit` as props and doesn't depend on `HealthMetricKey`.

- [ ] **Step 2: Update `HealthGrid` to render dynamically from config**

Replace `components/dashboard/health-grid.tsx`:

```tsx
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

  const hasBothBp =
    configs.some((c) => c.metric === "blood_pressure_systolic") &&
    configs.some((c) => c.metric === "blood_pressure_diastolic");

  const sortedConfigs = [...configs].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  // Filter out BP metrics if we're rendering them as a combined chart
  const bpKeys = new Set([
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
  ]);
  const singleConfigs = hasBothBp
    ? sortedConfigs.filter((c) => !bpKeys.has(c.metric))
    : sortedConfigs;

  if (configs.length === 0) return null;

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
        {hasBothBp && (
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

- [ ] **Step 3: Update `HealthGrid` test**

Replace `components/dashboard/health-grid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthGrid } from "@/components/dashboard/health-grid";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

const metrics: HealthMetric[] = [
  { date: "2026-03-01", metric: "weight", value: 82, unit: "kg" },
  { date: "2026-03-01", metric: "resting_heart_rate", value: 58, unit: "bpm" },
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
];

const configs: HealthMetricConfig[] = [
  {
    metric: "weight",
    label: "Weight",
    unit: "kg",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "resting_heart_rate",
    label: "Resting Heart Rate",
    unit: "bpm",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "blood_pressure_systolic",
    label: "Blood Pressure Systolic",
    unit: "mmHg",
    aggregation: "avg",
    visible: true,
  },
  {
    metric: "blood_pressure_diastolic",
    label: "Blood Pressure Diastolic",
    unit: "mmHg",
    aggregation: "avg",
    visible: true,
  },
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
    expect(screen.getByText("Resting Heart Rate")).toBeInTheDocument();
    expect(screen.getByText("Blood Pressure")).toBeInTheDocument();
  });

  it("returns null when no configs", () => {
    const { container } = render(<HealthGrid metrics={[]} configs={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
```

- [ ] **Step 4: Update `HealthChart` test**

In `components/dashboard/health-chart.test.tsx`, update the test data to use `string` metric type (remove the cast to `HealthMetricKey`). The existing test should work as-is since `HealthMetric.metric` is now `string`. No changes needed.

- [ ] **Step 5: Update `BloodPressureChart` test**

Same as above — the test data uses string literal metric values which are already valid `string` type. No changes needed.

- [ ] **Step 6: Update `app/page.tsx`**

Replace the `getHealthMetrics` import and usage:

Change:

```ts
import {
  getActiveSupplements,
  getHealthMetrics,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVocabulary,
} from "@/db/queries";
```

To:

```ts
import {
  getActiveSupplements,
  getHealthMetricConfigs,
  getVisibleHealthMetrics,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVocabulary,
} from "@/db/queries";
```

Change:

```ts
const healthMetrics = await getHealthMetrics(db);
```

To:

```ts
const [healthMetrics, healthConfigs] = await Promise.all([
  getVisibleHealthMetrics(db),
  getHealthMetricConfigs(db),
]);
```

Change:

```tsx
<HealthGrid metrics={healthMetrics} />
```

To:

```tsx
<HealthGrid
  metrics={healthMetrics}
  configs={healthConfigs.filter((c) => c.visible)}
/>
```

- [ ] **Step 7: Run tests**

```bash
bun run test
```

Expected: PASS

- [ ] **Step 8: Run full check**

```bash
bun run check
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/health-grid.tsx components/dashboard/health-grid.test.tsx components/dashboard/health-chart.test.tsx components/dashboard/blood-pressure-chart.test.tsx app/page.tsx
git commit -m "feat: render health dashboard dynamically from metric config"
```

---

### Task 8: Update public data API

**Files:**

- Modify: `app/api/data/route.ts`

- [ ] **Step 1: Update the data route**

Replace `app/api/data/route.ts`:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  getReadingsWithMeasurements,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";

export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const [vocabulary, readings, healthMetrics] = await Promise.all([
    getVocabulary(db),
    getReadingsWithMeasurements(db),
    getVisibleHealthMetrics(db),
  ]);

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

- [ ] **Step 2: Run check**

```bash
bun run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/data/route.ts
git commit -m "feat: return only visible health metrics in public data API"
```

---

### Task 9: Update specs and clean up

**Files:**

- Modify: `specs/architecture.md`

- [ ] **Step 1: Update `specs/architecture.md`**

In the Route Structure table, add:

```
| `/admin/health`    | Auth   | Health data import & visibility |
```

In the API Routes table, replace the `health-metrics` row with:

```
| POST   | `/api/health-import`  | Import aggregated health metrics from XML parse    |
| GET    | `/api/health-config`  | Return all health metric configs                   |
| PATCH  | `/api/health-config`  | Toggle metric visibility on dashboard              |
```

In the Component Architecture section, under `components/admin/`, add:

```
  - `health-import` — XML file drop zone with progress
```

In the Data section, update the table list:

```
D1 SQLite database with tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`, `health_metrics`, `health_metric_config`.
```

In the Environment Variables section, remove the `HEALTH_API_TOKEN` line.

- [ ] **Step 2: Run check**

```bash
bun run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add specs/architecture.md
git commit -m "docs: update architecture spec for health XML import"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full validation suite**

```bash
bun run check:full
```

Expected: PASS — all types check, all tests pass, production build succeeds.

- [ ] **Step 2: Verify no references to old code remain**

Search for any remaining references to the deleted endpoint or old types:

```bash
grep -r "HEALTH_METRIC_KEYS\|HEALTH_API_TOKEN\|health-metrics\|HealthMetricKey\|HealthMetricsRequest" --include="*.ts" --include="*.tsx" .
```

Expected: No matches (other than node_modules).

- [ ] **Step 3: Test manually**

1. Run `bun run dev` and open `http://localhost:3000/admin/health`
2. Verify the drop zone and empty visibility section render
3. Drop a small test XML file and verify parsing + upload works
4. Toggle some metrics visible and verify the public dashboard updates
