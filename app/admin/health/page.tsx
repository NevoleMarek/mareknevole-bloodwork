import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HealthAdmin } from "@/components/admin/health-admin";
import { getHealthMetricConfigs } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const { env } = await getCloudflareContext();
  const configs = await getHealthMetricConfigs(env.DB);

  return (
    <>
      <div className="admin-page-title">
        <p className="eyebrow">Daily signals</p>
        <h1 className="mt-2">Health data</h1>
        <p>Import daily measurements and choose what appears publicly.</p>
      </div>
      <HealthAdmin configs={configs} />
    </>
  );
}
