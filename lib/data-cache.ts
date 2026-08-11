import { revalidateTag, unstable_cache } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  getActiveSupplements,
  getBiomarkerTrend,
  getLabOverview,
  getSupplementChangelog,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
import { getCutoffDate } from "@/lib/period";
import type { Period } from "@/lib/period";

const DASHBOARD_TAG = "dashboard-core";
const HEALTH_TAG = "health";
const TREND_TAG = "lab-trends";
const DAY = 86_400;

export const getCachedDashboard = unstable_cache(
  async () => {
    const { env } = await getCloudflareContext();
    const [vocabulary, labs, supplements, changelog] = await Promise.all([
      getVocabulary(env.DB),
      getLabOverview(env.DB),
      getActiveSupplements(env.DB),
      getSupplementChangelog(env.DB),
    ]);
    return { vocabulary, labs, supplements, changelog };
  },
  [DASHBOARD_TAG],
  { tags: [DASHBOARD_TAG], revalidate: DAY },
);

export const getCachedBiomarkerTrend = unstable_cache(
  async (key: string) => {
    const { env } = await getCloudflareContext();
    return getBiomarkerTrend(env.DB, key);
  },
  [TREND_TAG],
  { tags: [DASHBOARD_TAG, TREND_TAG], revalidate: DAY },
);

export const getCachedVisibleVocabularyKeys = unstable_cache(
  async () => {
    const { env } = await getCloudflareContext();
    const vocabulary = await getVocabulary(env.DB);
    return vocabulary
      .filter((entry) => entry.visible)
      .map((entry) => entry.key);
  },
  ["visible-vocabulary-keys"],
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
