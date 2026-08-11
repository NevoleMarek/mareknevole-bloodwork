import {
  getCachedBiomarkerTrend,
  getCachedVisibleVocabularyKeys,
} from "@/lib/data-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const visibleKeys = await getCachedVisibleVocabularyKeys();
  if (!visibleKeys.includes(key)) {
    return Response.json({ error: "Unknown biomarker" }, { status: 404 });
  }

  const points = await getCachedBiomarkerTrend(key);
  return Response.json({ points });
}
