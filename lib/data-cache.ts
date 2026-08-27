import { revalidateTag, unstable_cache } from "next/cache";
import { readCloudflareEnv } from "@/lib/effect/runtime";

import {
  getActiveSupplements,
  getBiomarkerTrend,
  getLabOverview,
  getSupplementChangelogPage,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
import { getCutoffDate } from "@/lib/period";
import type { Period, TrendPeriod } from "@/lib/period";
import type {
  BiomarkerTrendPoint,
  DashboardSnapshot,
} from "@/lib/schemas/domain";

const DASHBOARD_TAG = "dashboard-core";
const HEALTH_TAG = "health";
const TREND_TAG = "lab-trends";
const CHANGELOG_TAG = "changelog";
const DAY = 86_400;

export const getCachedDashboard = unstable_cache(
  async (
    asOfDate = new Date().toISOString().slice(0, 10),
  ): Promise<DashboardSnapshot> => {
    const env = await readCloudflareEnv();
    const [vocabulary, labs, supplements] = await Promise.all([
      getVocabulary(env.DB),
      getLabOverview(env.DB),
      getActiveSupplements(env.DB, `${asOfDate}T23:59:59.999Z`),
    ]);
    return { vocabulary, labs, supplements };
  },
  [DASHBOARD_TAG],
  { tags: [DASHBOARD_TAG], revalidate: DAY },
);

export const getCachedFirstChangelogPage = unstable_cache(
  async () => {
    const env = await readCloudflareEnv();
    return getSupplementChangelogPage(env.DB, null);
  },
  [CHANGELOG_TAG],
  { tags: [DASHBOARD_TAG, CHANGELOG_TAG], revalidate: DAY },
);

export const getCachedBiomarkerTrend = unstable_cache(
  async (key: string, period: TrendPeriod): Promise<BiomarkerTrendPoint[]> => {
    const env = await readCloudflareEnv();
    return getBiomarkerTrend(env.DB, key, getCutoffDate(period));
  },
  [TREND_TAG],
  { tags: [DASHBOARD_TAG, TREND_TAG], revalidate: DAY },
);

export const getCachedVisibleVocabularyKeys = unstable_cache(
  async () => {
    const env = await readCloudflareEnv();
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
    const env = await readCloudflareEnv();
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
