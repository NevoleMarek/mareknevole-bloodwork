import assert from "node:assert";
import * as Schema from "effect/Schema";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { createReadingsGetHandler } from "@/app/api/readings/get-handler";
import { getReadingPage } from "@/db/queries";
import { invalidateDashboard } from "@/lib/data-cache";
import {
  IdRequestSchema,
  SaveReadingRequestSchema,
} from "@/lib/domain-schemas";
import type { SaveReadingResponse } from "@/types/wizard";

export const GET = createReadingsGetHandler({
  getDatabase: async () => (await getCloudflareContext()).env.DB,
  getPage: getReadingPage,
});

export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const { id } = Schema.decodeUnknownSync(IdRequestSchema)(
    await request.json(),
  );
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
  const body = Schema.decodeUnknownSync(SaveReadingRequestSchema)(
    await request.json(),
  );

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
