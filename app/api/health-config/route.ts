import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as Schema from "effect/Schema";

import { getHealthMetricConfigs } from "@/db/queries";
import { invalidateHealth } from "@/lib/data-cache";
import { HealthVisibilityRequestSchema } from "@/lib/domain-schemas";

export async function GET() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);
  return Response.json(configs);
}

export async function PATCH(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const body = Schema.decodeUnknownSync(HealthVisibilityRequestSchema)(
    await request.json(),
  );

  await db
    .prepare("UPDATE health_metric_config SET visible = ? WHERE metric = ?")
    .bind(body.visible ? 1 : 0, body.metric)
    .run();

  invalidateHealth();

  return Response.json({ ok: true });
}
