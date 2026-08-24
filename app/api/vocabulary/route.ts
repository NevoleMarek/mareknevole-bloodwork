import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as Schema from "effect/Schema";

import { getVocabulary } from "@/db/queries";
import { invalidateDashboard } from "@/lib/data-cache";
import {
  KeyRequestSchema,
  VocabularyEntryRequestSchema,
} from "@/lib/domain-schemas";

export async function GET() {
  const { env } = await getCloudflareContext();
  return Response.json({ entries: await getVocabulary(env.DB) });
}

export async function POST(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { entry } = Schema.decodeUnknownSync(VocabularyEntryRequestSchema)(
    await req.json(),
  );

  await db
    .prepare(
      "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max, description, featured, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      entry.key,
      entry.label,
      entry.unit,
      entry.referenceRange.min,
      entry.referenceRange.max,
      entry.description,
      entry.featured ? 1 : 0,
      entry.visible ? 1 : 0,
    )
    .run();

  invalidateDashboard();

  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { entry } = Schema.decodeUnknownSync(VocabularyEntryRequestSchema)(
    await req.json(),
  );

  const result = await db
    .prepare(
      "UPDATE vocabulary SET label = ?, unit = ?, reference_min = ?, reference_max = ?, description = ?, featured = ?, visible = ? WHERE key = ?",
    )
    .bind(
      entry.label,
      entry.unit,
      entry.referenceRange.min,
      entry.referenceRange.max,
      entry.description,
      entry.featured ? 1 : 0,
      entry.visible ? 1 : 0,
      entry.key,
    )
    .run();

  if (result.meta.changes === 0)
    return Response.json({ error: "Not found" }, { status: 404 });

  invalidateDashboard();

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { key } = Schema.decodeUnknownSync(KeyRequestSchema)(await req.json());

  await db.prepare("DELETE FROM vocabulary WHERE key = ?").bind(key).run();

  invalidateDashboard();

  return Response.json({ ok: true });
}
