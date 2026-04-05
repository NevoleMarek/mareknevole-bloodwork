import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getHealthMetricConfigs } from "@/db/queries";

export async function GET() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);
  return Response.json(configs);
}

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

  revalidatePath("/");

  return Response.json({ ok: true });
}
