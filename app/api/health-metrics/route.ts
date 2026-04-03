import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HEALTH_METRIC_KEYS } from "@/types/health";
import type { HealthMetricsRequest } from "@/types/health";

const VALID_KEYS = new Set<string>(HEALTH_METRIC_KEYS);

type ValidMetric = { metric: string; value: number; unit: string };

function parse(body: HealthMetricsRequest): {
  error: string | null;
  metrics: ValidMetric[];
} {
  if (typeof body.date !== "string" || body.date.length === 0)
    return { error: "Missing date", metrics: [] };
  if (isNaN(Date.parse(body.date)))
    return { error: "Invalid date", metrics: [] };
  if (!Array.isArray(body.metrics))
    return { error: "Missing metrics", metrics: [] };

  const valid: ValidMetric[] = [];
  for (const m of body.metrics) {
    if (!VALID_KEYS.has(m.metric)) continue;
    if (typeof m.value !== "number" || !isFinite(m.value)) continue;
    if (typeof m.unit !== "string" || m.unit.length === 0) continue;
    valid.push(m);
  }
  return { error: null, metrics: valid };
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const session = request.headers.get("cookie")?.includes("bloodwork-session");
  if (!token && !session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (token && token !== env.HEALTH_API_TOKEN)
    return Response.json({ error: "Invalid token" }, { status: 401 });

  const db = env.DB;
  const body = (await request.json()) as HealthMetricsRequest;

  const { error, metrics } = parse(body);
  if (error) return Response.json({ error }, { status: 400 });
  if (metrics.length === 0) return Response.json({ saved: 0, skipped: "all" });

  const statements = metrics.map((m) =>
    db
      .prepare(
        "INSERT OR REPLACE INTO health_metrics (date, metric, value, unit) VALUES (?, ?, ?, ?)",
      )
      .bind(body.date, m.metric, m.value, m.unit),
  );

  await db.batch(statements);

  return Response.json({ saved: metrics.length });
}
