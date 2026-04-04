import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { SaveReadingRequest, SaveReadingResponse } from "@/types/wizard";

export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { date } = (await request.json()) as { date: string };

  const reading = await db
    .prepare("SELECT id FROM readings WHERE date = ?")
    .bind(date)
    .first<{ id: string }>();

  if (!reading) return Response.json({ error: "Not found" }, { status: 404 });

  // CASCADE handles measurements
  await db.prepare("DELETE FROM readings WHERE id = ?").bind(reading.id).run();

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
          "INSERT INTO measurements (id, reading_id, vocabulary_key, value, unit, status) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          readingId,
          m.vocabularyKey,
          m.value,
          m.unit,
          m.status,
        ),
    );
  }

  await db.batch(statements);

  return Response.json({ readingId } satisfies SaveReadingResponse);
}
