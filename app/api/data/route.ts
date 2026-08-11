import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getReadingsWithMeasurements, getVocabulary } from "@/db/queries";

export async function GET() {
  const { env } = await getCloudflareContext();
  const db = env.DB;

  const [vocabulary, readings] = await Promise.all([
    getVocabulary(db),
    getReadingsWithMeasurements(db),
  ]);

  return Response.json({
    vocabulary: { entries: vocabulary },
    readings: readings.map((r) => ({
      date: r.date,
      source: r.source,
      measurements: r.measurements,
    })),
  });
}
