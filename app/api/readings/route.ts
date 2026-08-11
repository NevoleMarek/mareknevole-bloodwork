import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getReadingPage } from "@/db/queries";
import { invalidateDashboard } from "@/lib/data-cache";
import type { ReadingCursor } from "@/types/bloodwork";
import type { SaveReadingRequest, SaveReadingResponse } from "@/types/wizard";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const id = params.get("id");
  const hasDate = params.has("date");
  const hasId = params.has("id");
  const hasCursor = hasDate || hasId;
  if (hasCursor && !(hasDate && hasId)) {
    return Response.json({ error: "Invalid cursor" }, { status: 400 });
  }

  let cursor: ReadingCursor | null = null;
  if (hasCursor) {
    assert(date !== null && id !== null);
    cursor = { date, id };
  }
  const { env } = await getCloudflareContext();
  return Response.json(await getReadingPage(env.DB, cursor));
}

export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id } = (await request.json()) as { id: string };
  const result = await db
    .prepare("DELETE FROM readings WHERE id = ?")
    .bind(id)
    .run();
  if (result.meta.changes === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  invalidateDashboard();

  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await request.json()) as SaveReadingRequest;

  assert(body.measurements.length > 0, "No measurements");

  const readingId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];

  // Insert new vocabulary entries
  for (const entry of body.newVocabulary) {
    statements.push(
      db
        .prepare(
          "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max, description) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          entry.key,
          entry.label,
          entry.unit,
          entry.referenceRange.min,
          entry.referenceRange.max,
          entry.description,
        ),
    );
  }

  // Insert reading
  statements.push(
    db
      .prepare("INSERT INTO readings (id, date, source) VALUES (?, ?, ?)")
      .bind(readingId, body.date, body.source),
  );

  // Insert measurements
  for (const m of body.measurements) {
    statements.push(
      db
        .prepare(
          "INSERT INTO measurements (id, reading_id, vocabulary_key, value, unit, status, reading_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          readingId,
          m.vocabularyKey,
          m.value,
          m.unit,
          m.status,
          body.date,
        ),
    );
  }

  await db.batch(statements);

  invalidateDashboard();

  return Response.json({ readingId } satisfies SaveReadingResponse);
}
