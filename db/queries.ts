/// <reference types="@cloudflare/workers-types" />

import * as Schema from "effect/Schema";
import {
  BiomarkerTrendRow,
  HealthMetricConfigRow,
  HealthMetricRow,
  MeasurementRow,
  ReadingCountRow,
  ReadingRow,
  ReadingSummaryRow,
  SupplementChangelogRow,
  SupplementRow,
  VocabularyRow,
} from "@/lib/schemas/rows";
import type {
  BiomarkerTrendPoint,
  ChangelogCursor,
  ChangelogPage,
  LabOverview,
  Measurement,
  ReadingCursor,
  ReadingPage,
  ReadingWithMeasurements,
  Supplement,
  SupplementChangelog,
  VocabularyEntry,
} from "@/types/bloodwork";
import type { HealthData, HealthMetricConfig } from "@/types/health";

// -- Row mappers --

export function mapVocabularyRow(row: VocabularyRow): VocabularyEntry {
  return {
    key: row.key,
    label: row.label,
    unit: row.unit,
    referenceRange: { min: row.reference_min, max: row.reference_max },
    description: row.description,
    featured: row.featured === 1,
    visible: row.visible === 1,
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
    status: row.status,
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

export function mapHealthMetricConfigRow(
  row: HealthMetricConfigRow,
): HealthMetricConfig {
  return {
    metric: row.metric,
    label: row.label,
    unit: row.unit,
    aggregation: row.aggregation,
    visible: row.visible === 1,
  };
}

// -- Query functions --

function resultsOf<T>(query: string, result: D1Result<T>): T[] {
  console.info("d1.query", {
    query,
    rowsRead: result.meta.rows_read,
    rowsReturned: result.results.length,
    durationMs: result.meta.duration,
  });
  return result.results;
}

async function decodeRows<S extends Schema.ConstraintDecoder<unknown, never>>(
  schema: S,
  rows: readonly unknown[],
): Promise<S["Type"][]> {
  return Promise.all(
    rows.map((row) => Schema.decodeUnknownPromise(schema)(row)),
  );
}

export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const result = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max, description, featured, visible FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  const rows = await decodeRows(VocabularyRow, resultsOf("vocabulary", result));
  return rows.map(mapVocabularyRow);
}

export async function getLabOverview(db: D1Database): Promise<LabOverview> {
  const [latestResult, countResult, measurementResult] = await Promise.all([
    db
      .prepare(
        "SELECT id, date, source FROM readings ORDER BY date DESC, id DESC LIMIT 1",
      )
      .all<ReadingRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM readings").all<ReadingCountRow>(),
    db
      .prepare(
        `SELECT m.id, m.reading_id, m.vocabulary_key, m.value, m.unit, m.status
         FROM vocabulary v
         JOIN measurements m ON m.id = (
           SELECT latest.id
           FROM measurements latest
           WHERE latest.vocabulary_key = v.key
           ORDER BY latest.reading_date DESC, latest.reading_id DESC, latest.id DESC
           LIMIT 1
         )
         WHERE v.visible = 1`,
      )
      .all<MeasurementRow>(),
  ]);
  const latest = (
    await decodeRows(ReadingRow, resultsOf("latest-reading", latestResult))
  )[0];
  const panelCount = (
    await decodeRows(ReadingCountRow, resultsOf("reading-count", countResult))
  )[0].count;
  const latestMeasurements = await decodeRows(
    MeasurementRow,
    resultsOf("latest-measurements", measurementResult),
  );
  return {
    latestPanel: latest ? { date: latest.date, source: latest.source } : null,
    latestMeasurements: latestMeasurements.map(mapMeasurementRow),
    panelCount,
  };
}

export async function getBiomarkerTrend(
  db: D1Database,
  key: string,
): Promise<BiomarkerTrendPoint[]> {
  const result = await db
    .prepare(
      `SELECT r.date, m.value
       FROM (
         SELECT reading_id, MAX(id) AS measurement_id
         FROM measurements
         WHERE vocabulary_key = ?
         GROUP BY reading_id
       ) selected
       JOIN measurements m ON m.id = selected.measurement_id
       JOIN readings r ON r.id = selected.reading_id
       ORDER BY r.date, r.id`,
    )
    .bind(key)
    .all<BiomarkerTrendRow>();
  return await decodeRows(
    BiomarkerTrendRow,
    resultsOf("biomarker-trend", result),
  );
}

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
  const decodedMeasurements = await decodeRows(
    MeasurementRow,
    resultsOf("measurements", measurements),
  );
  for (const row of decodedMeasurements) {
    const list = byReading.get(row.reading_id) ?? [];
    list.push(mapMeasurementRow(row));
    byReading.set(row.reading_id, list);
  }

  const decodedReadings = await decodeRows(
    ReadingRow,
    resultsOf("readings", readings),
  );
  return decodedReadings.map((r) => ({
    ...mapReadingRow(r),
    measurements: byReading.get(r.id) ?? [],
  }));
}

const READING_PAGE_SIZE = 20;

export async function getReadingPage(
  db: D1Database,
  cursor: ReadingCursor | null,
): Promise<ReadingPage> {
  const statement = cursor
    ? db
        .prepare(
          `SELECT r.id, r.date, r.source,
                  (SELECT COUNT(*) FROM measurements m WHERE m.reading_id = r.id) AS measurement_count
           FROM readings r
           WHERE (r.date, r.id) < (?, ?)
           ORDER BY r.date DESC, r.id DESC
           LIMIT ?`,
        )
        .bind(cursor.date, cursor.id, READING_PAGE_SIZE + 1)
    : db
        .prepare(
          `SELECT r.id, r.date, r.source,
                  (SELECT COUNT(*) FROM measurements m WHERE m.reading_id = r.id) AS measurement_count
           FROM readings r
           ORDER BY r.date DESC, r.id DESC
           LIMIT ?`,
        )
        .bind(READING_PAGE_SIZE + 1);
  const result = await statement.all<ReadingSummaryRow>();
  const rows = await decodeRows(
    ReadingSummaryRow,
    resultsOf("reading-page", result),
  );
  const entries = rows.slice(0, READING_PAGE_SIZE).map((row) => ({
    id: row.id,
    date: row.date,
    source: row.source,
    measurementCount: row.measurement_count,
  }));
  const last = entries.at(-1);
  return {
    entries,
    nextCursor:
      rows.length > READING_PAGE_SIZE && last
        ? { date: last.date, id: last.id }
        : null,
  };
}

export async function getActiveSupplements(
  db: D1Database,
): Promise<Supplement[]> {
  const result = await db
    .prepare("SELECT * FROM supplements WHERE stopped_at IS NULL ORDER BY name")
    .all<SupplementRow>();
  const rows = await decodeRows(
    SupplementRow,
    resultsOf("active-supplements", result),
  );
  return rows.map(mapSupplementRow);
}

export async function getSupplementChangelog(
  db: D1Database,
): Promise<SupplementChangelog[]> {
  const result = await db
    .prepare(
      "SELECT * FROM supplement_changelog ORDER BY date DESC, created_at DESC, id DESC",
    )
    .all<SupplementChangelogRow>();
  const rows = await decodeRows(
    SupplementChangelogRow,
    resultsOf("supplement-changelog", result),
  );
  return rows.map(mapSupplementChangelogRow);
}

const CHANGELOG_PAGE_SIZE = 20;

export async function getSupplementChangelogPage(
  db: D1Database,
  cursor: ChangelogCursor | null,
): Promise<ChangelogPage> {
  const statement = cursor
    ? db
        .prepare(
          `SELECT id, date, description, created_at
           FROM supplement_changelog
           WHERE (date, created_at, id) < (?, ?, ?)
           ORDER BY date DESC, created_at DESC, id DESC
           LIMIT ?`,
        )
        .bind(cursor.date, cursor.createdAt, cursor.id, CHANGELOG_PAGE_SIZE + 1)
    : db
        .prepare(
          `SELECT id, date, description, created_at
           FROM supplement_changelog
           ORDER BY date DESC, created_at DESC, id DESC
           LIMIT ?`,
        )
        .bind(CHANGELOG_PAGE_SIZE + 1);
  const result = await statement.all<SupplementChangelogRow>();
  const rows = await decodeRows(
    SupplementChangelogRow,
    resultsOf("supplement-changelog-page", result),
  );
  const entries = rows
    .slice(0, CHANGELOG_PAGE_SIZE)
    .map(mapSupplementChangelogRow);
  const last = entries.at(-1);
  return {
    entries,
    nextCursor:
      rows.length > CHANGELOG_PAGE_SIZE && last
        ? { date: last.date, createdAt: last.createdAt, id: last.id }
        : null,
  };
}

export async function getVisibleHealthMetrics(
  db: D1Database,
  cutoffDate: string | null,
): Promise<HealthData> {
  const metricsQuery = cutoffDate
    ? db
        .prepare(
          `SELECT hm.date, hm.metric, hm.value, hm.unit
           FROM health_metric_config hmc
           JOIN health_metrics hm ON hm.metric = hmc.metric
           WHERE hmc.visible = 1 AND hm.date >= ?
           ORDER BY hm.date`,
        )
        .bind(cutoffDate)
    : db.prepare(
        `SELECT hm.date, hm.metric, hm.value, hm.unit
         FROM health_metric_config hmc
         JOIN health_metrics hm ON hm.metric = hmc.metric
         WHERE hmc.visible = 1
         ORDER BY hm.date`,
      );

  const [metricResults, configResults] = await Promise.all([
    metricsQuery.all<HealthMetricRow>(),
    db
      .prepare(
        "SELECT metric, label, unit, aggregation, visible FROM health_metric_config WHERE visible = 1 ORDER BY label",
      )
      .all<HealthMetricConfigRow>(),
  ]);
  return {
    metrics: await decodeRows(
      HealthMetricRow,
      resultsOf("visible-health-metrics", metricResults),
    ),
    configs: (
      await decodeRows(
        HealthMetricConfigRow,
        resultsOf("visible-health-config", configResults),
      )
    ).map(mapHealthMetricConfigRow),
  };
}

export async function getHealthMetricConfigs(
  db: D1Database,
): Promise<HealthMetricConfig[]> {
  const result = await db
    .prepare(
      "SELECT metric, label, unit, aggregation, visible FROM health_metric_config ORDER BY label",
    )
    .all<HealthMetricConfigRow>();
  const rows = await decodeRows(
    HealthMetricConfigRow,
    resultsOf("health-config", result),
  );
  return rows.map(mapHealthMetricConfigRow);
}
