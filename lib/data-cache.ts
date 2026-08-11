import { revalidateTag, unstable_cache } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  getActiveSupplements,
  getReadingsWithMeasurements,
  getSupplementChangelog,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
import { getCutoffDate } from "@/lib/period";
import type { Period } from "@/lib/period";

const DASHBOARD_TAG = "dashboard-core";
const HEALTH_TAG = "health";
const DAY = 86_400;

export const getCachedDashboard = unstable_cache(
  async () => {
    const { env } = await getCloudflareContext();
    const [vocabulary, readings, supplements, changelog] = await Promise.all([
      getVocabulary(env.DB),
      getReadingsWithMeasurements(env.DB),
      getActiveSupplements(env.DB),
      getSupplementChangelog(env.DB),
    ]);
    return { vocabulary, readings, supplements, changelog };
  },
  [DASHBOARD_TAG],
  { tags: [DASHBOARD_TAG], revalidate: DAY },
);

export const getCachedHealth = unstable_cache(
  async (period: Period) => {
    const { env } = await getCloudflareContext();
    return getVisibleHealthMetrics(env.DB, getCutoffDate(period));
  },
  [HEALTH_TAG],
  { tags: [HEALTH_TAG], revalidate: DAY },
);

export function invalidateDashboard() {
  revalidateTag(DASHBOARD_TAG, { expire: 0 });
}

export function invalidateHealth() {
  revalidateTag(HEALTH_TAG, { expire: 0 });
}
