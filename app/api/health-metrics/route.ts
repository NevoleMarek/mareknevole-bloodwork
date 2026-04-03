import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HEALTH_METRIC_KEYS } from "@/types/health";
import type { HealthMetricsRequest } from "@/types/health";

const VALID_KEYS = new Set<string>(HEALTH_METRIC_KEYS);

function validate(body: HealthMetricsRequest): string | null {
  if (typeof body.date !== "string" || body.date.length === 0)
    return "Missing date";
  if (isNaN(Date.parse(body.date))) return "Invalid date";
  if (!Array.isArray(body.metrics) || body.metrics.length === 0)
    return "Missing metrics";

  for (const m of body.metrics) {
    if (!VALID_KEYS.has(m.metric)) return `Unknown metric: ${m.metric}`;
    if (typeof m.value !== "number" || !isFinite(m.value))
      return `Invalid value for ${m.metric}`;
    if (typeof m.unit !== "string" || m.unit.length === 0)
      return `Missing unit for ${m.metric}`;
  }
  return null;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await request.json()) as HealthMetricsRequest;

  const error = validate(body);
  if (error) return Response.json({ error }, { status: 400 });

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
