import assert from "node:assert";
import * as Schema from "effect/Schema";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { invalidateDashboard } from "@/lib/data-cache";
import {
  ChangelogUpdateRequestSchema,
  IdRequestSchema,
} from "@/lib/domain-schemas";
export async function PUT(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id, description } = Schema.decodeUnknownSync(
    ChangelogUpdateRequestSchema,
  )(await request.json());
  assert(id && description, "id and description required");

  const result = await db
    .prepare("UPDATE supplement_changelog SET description = ? WHERE id = ?")
    .bind(description, id)
    .run();

  if (result.meta.changes === 0)
    return Response.json({ error: "Not found" }, { status: 404 });

  invalidateDashboard();

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id } = Schema.decodeUnknownSync(IdRequestSchema)(
    await request.json(),
  );

  await db
    .prepare("DELETE FROM supplement_changelog WHERE id = ?")
    .bind(id)
    .run();

  invalidateDashboard();

  return Response.json({ ok: true });
}
