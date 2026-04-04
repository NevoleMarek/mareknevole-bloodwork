import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HealthAdmin } from "@/components/admin/health-admin";
import { getHealthMetricConfigs } from "@/db/queries";

export default async function HealthPage() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);

  return <HealthAdmin configs={configs} />;
}
