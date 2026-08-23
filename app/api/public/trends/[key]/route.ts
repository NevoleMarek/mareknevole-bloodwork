import {
  getCachedBiomarkerTrend,
  getCachedVisibleVocabularyKeys,
} from "@/lib/data-cache";
import { createTrendHandler } from "@/app/api/public/trends/[key]/handler";

export const GET = createTrendHandler({
  getTrend: getCachedBiomarkerTrend,
  getVisibleKeys: getCachedVisibleVocabularyKeys,
});
