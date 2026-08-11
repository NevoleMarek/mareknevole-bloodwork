import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getSupplementChangelogPage } from "@/db/queries";
import { getCachedFirstChangelogPage } from "@/lib/data-cache";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const createdAt = params.get("createdAt");
  const id = params.get("id");
  const hasDate = params.has("date");
  const hasCreatedAt = params.has("createdAt");
  const hasId = params.has("id");
  const hasCursor = hasDate || hasCreatedAt || hasId;
  if (hasCursor && !(hasDate && hasCreatedAt && hasId)) {
    return Response.json({ error: "Invalid cursor" }, { status: 400 });
  }

  if (!hasCursor) return Response.json(await getCachedFirstChangelogPage());

  assert(date !== null && createdAt !== null && id !== null);
  const { env } = await getCloudflareContext();
  return Response.json(
    await getSupplementChangelogPage(env.DB, { date, createdAt, id }),
  );
}
