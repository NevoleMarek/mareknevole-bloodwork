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
  assert(
    Array.isArray(body.metrics) && body.metrics.length > 0,
    "Missing metrics",
  );

  for (const m of body.metrics) {
    assert(VALID_KEYS.has(m.metric), `Unknown metric: ${m.metric}`);
    assert(
      typeof m.value === "number" && isFinite(m.value),
      `Invalid value for ${m.metric}`,
    );
    assert(
      typeof m.unit === "string" && m.unit.length > 0,
      `Missing unit for ${m.metric}`,
    );
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
