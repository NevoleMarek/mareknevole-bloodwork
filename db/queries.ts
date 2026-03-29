/// <reference types="@cloudflare/workers-types" />

import type {
  Measurement,
  Supplement,
  SupplementChangelog,
  VocabularyEntry,
} from "@/types/bloodwork";

// -- Row types (snake_case, matching D1 columns) --

type VocabularyRow = {
  key: string;
  label: string;
  unit: string;
  reference_min: number;
  reference_max: number;
};

type ReadingRow = {
  id: string;
  date: string;
  source: string;
};

type MeasurementRow = {
  id: string;
  reading_id: string;
  vocabulary_key: string;
  value: number;
  unit: string;
  status: string;
};

type SupplementRow = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupplementChangelogRow = {
  id: string;
  date: string;
  description: string;
  created_at: string;
};

// -- Row mappers --

export function mapVocabularyRow(row: VocabularyRow): VocabularyEntry {
  return {
    key: row.key,
    label: row.label,
    unit: row.unit,
    referenceRange: { min: row.reference_min, max: row.reference_max },
  };
}

export function mapReadingRow(row: ReadingRow): ReadingRow {
  return { id: row.id, date: row.date, source: row.source };
}

export function mapMeasurementRow(row: MeasurementRow): Measurement {
  return {
    vocabularyKey: row.vocabulary_key,
    value: row.value,
    unit: row.unit,
    status: row.status as Measurement["status"],
  };
}

export function mapSupplementRow(row: SupplementRow): Supplement {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    frequency: row.frequency,
    startedAt: row.started_at,
    stoppedAt: row.stopped_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSupplementChangelogRow(
  row: SupplementChangelogRow,
): SupplementChangelog {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    createdAt: row.created_at,
  };
}

// -- Query functions --

export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const { results } = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  return results.map(mapVocabularyRow);
}

type ReadingWithMeasurements = ReadingRow & { measurements: Measurement[] };

export async function getReadingsWithMeasurements(
  db: D1Database,
): Promise<ReadingWithMeasurements[]> {
  const [readings, measurements] = await Promise.all([
    db
      .prepare("SELECT id, date, source FROM readings ORDER BY date DESC")
      .all<ReadingRow>(),
    db
      .prepare(
        "SELECT id, reading_id, vocabulary_key, value, unit, status FROM measurements",
      )
      .all<MeasurementRow>(),
  ]);

  const byReading = new Map<string, Measurement[]>();
  for (const row of measurements.results) {
    const list = byReading.get(row.reading_id) ?? [];
    list.push(mapMeasurementRow(row));
    byReading.set(row.reading_id, list);
  }

  return readings.results.map((r) => ({
    ...mapReadingRow(r),
    measurements: byReading.get(r.id) ?? [],
  }));
}

export async function getActiveSupplements(
  db: D1Database,
): Promise<Supplement[]> {
  const { results } = await db
    .prepare("SELECT * FROM supplements WHERE stopped_at IS NULL ORDER BY name")
    .all<SupplementRow>();
  return results.map(mapSupplementRow);
}

export async function getSupplementChangelog(
  db: D1Database,
): Promise<SupplementChangelog[]> {
  const { results } = await db
    .prepare("SELECT * FROM supplement_changelog ORDER BY date DESC")
    .all<SupplementChangelogRow>();
  return results.map(mapSupplementChangelogRow);
}
