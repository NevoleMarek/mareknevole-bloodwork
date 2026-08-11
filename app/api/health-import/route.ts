import { getCloudflareContext } from "@opennextjs/cloudflare";

import { invalidateHealth } from "@/lib/data-cache";
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

  invalidateHealth();

  const days = new Set(body.metrics.map((m) => m.date)).size;

  return Response.json({
    saved: body.metrics.length,
    metrics: body.configs.length,
    days,
  });
}
