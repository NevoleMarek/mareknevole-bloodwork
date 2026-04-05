import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { VocabularyEntry } from "@/types/bloodwork";

export async function POST(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { entry } = (await req.json()) as { entry: VocabularyEntry };

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

  revalidatePath("/");

  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { entry } = (await req.json()) as { entry: VocabularyEntry };

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

  revalidatePath("/");

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { key } = (await req.json()) as { key: string };

  await db.prepare("DELETE FROM vocabulary WHERE key = ?").bind(key).run();

  revalidatePath("/");

  return Response.json({ ok: true });
}
