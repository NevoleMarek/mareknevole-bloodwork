import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { SaveReadingRequest, SaveReadingResponse } from "@/types/wizard";

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
          "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          entry.key,
          entry.label,
          entry.unit,
          entry.referenceRange.min,
          entry.referenceRange.max,
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
