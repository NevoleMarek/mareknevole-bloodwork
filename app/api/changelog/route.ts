import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function PUT(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id, description } = (await request.json()) as {
    id: string;
    description: string;
  };
  assert(id && description, "id and description required");

  const result = await db
    .prepare("UPDATE supplement_changelog SET description = ? WHERE id = ?")
    .bind(description, id)
    .run();

  if (result.meta.changes === 0)
    return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id } = (await request.json()) as { id: string };

  await db
    .prepare("DELETE FROM supplement_changelog WHERE id = ?")
    .bind(id)
    .run();

  return Response.json({ ok: true });
}
