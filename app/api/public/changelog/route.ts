import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createChangelogHandler } from "@/app/api/public/changelog/handler";
import { getSupplementChangelogPage } from "@/db/queries";
import { getCachedFirstChangelogPage } from "@/lib/data-cache";

export const GET = createChangelogHandler({
  getDatabase: async () => (await getCloudflareContext()).env.DB,
  getFirstPage: getCachedFirstChangelogPage,
  getPage: getSupplementChangelogPage,
});
