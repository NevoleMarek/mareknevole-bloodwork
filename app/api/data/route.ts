import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createDataHandler } from "@/app/api/data/handler";
import { getReadingsWithMeasurements, getVocabulary } from "@/db/queries";

export const GET = createDataHandler({
  getDatabase: async () => (await getCloudflareContext()).env.DB,
  getReadings: getReadingsWithMeasurements,
  getVocabulary,
});
