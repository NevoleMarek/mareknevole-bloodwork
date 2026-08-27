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
  DashboardSnapshot,
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
    version: row.version,
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
    version: row.version,
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

/**
 * D1 batches execute all statements in one transaction. Keeping the result
 * extraction here makes it harder to accidentally reintroduce independent
 * reads into a snapshot query.
 */
function batchRows<T>(
  results: readonly D1Result<unknown>[],
  index: number,
  operation: string,
): T[] {
  const result = results[index];
  if (!result) throw new Error(`Missing D1 batch result for ${operation}`);
  // SAFETY: D1 preserves the statement order and each caller supplies the
  // row type for the corresponding batch position.
  return resultsOf(operation, result) as T[];
}

export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const result = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max, description, featured, visible, version FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  const rows = await decodeRows(VocabularyRow, resultsOf("vocabulary", result));
  return rows.map(mapVocabularyRow);
}

export async function getLabOverview(db: D1Database): Promise<LabOverview> {
  const [latestResult, countResult, measurementResult] = await db.batch([
    db.prepare(
      "SELECT id, date, source FROM readings ORDER BY date DESC, id DESC LIMIT 1",
    ),
    db.prepare("SELECT COUNT(*) AS count FROM readings"),
    db.prepare(
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
    ),
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

/**
 * Read every public dashboard resource under one D1 transaction. A set of
 * independent SELECT promises can observe different commits (for example a
 * new panel paired with the previous supplement list), so the dashboard
 * cache must use this combined snapshot instead.
 */
export async function getDashboardSnapshot(
  db: D1Database,
): Promise<DashboardSnapshot> {
  const results = await db.batch([
    db.prepare(
      "SELECT key, label, unit, reference_min, reference_max, description, featured, visible, version FROM vocabulary ORDER BY label",
    ),
    db.prepare(
      "SELECT id, date, source FROM readings ORDER BY date DESC, id DESC LIMIT 1",
    ),
    db.prepare("SELECT COUNT(*) AS count FROM readings"),
    db.prepare(
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
    ),
    db.prepare(
      `SELECT id, name, dose, frequency, started_at, stopped_at,
              created_at, updated_at, version
       FROM supplements
       WHERE stopped_at IS NULL
       ORDER BY name`,
    ),
  ]);

  const vocabulary = (
    await decodeRows(
      VocabularyRow,
      batchRows(results, 0, "dashboard-vocabulary"),
    )
  ).map(mapVocabularyRow);
  const latest = (
    await decodeRows(
      ReadingRow,
      batchRows(results, 1, "dashboard-latest-reading"),
    )
  )[0];
  const panelCount = (
    await decodeRows(
      ReadingCountRow,
      batchRows(results, 2, "dashboard-reading-count"),
    )
  )[0].count;
  const latestMeasurements = (
    await decodeRows(
      MeasurementRow,
      batchRows(results, 3, "dashboard-latest-measurements"),
    )
  ).map(mapMeasurementRow);
  const supplements = (
    await decodeRows(
      SupplementRow,
      batchRows(results, 4, "dashboard-supplements"),
    )
  ).map(mapSupplementRow);

  return {
    vocabulary,
    labs: {
      latestPanel: latest ? { date: latest.date, source: latest.source } : null,
      latestMeasurements,
      panelCount,
    },
    supplements,
  };
}

export async function getBiomarkerTrend(
  db: D1Database,
  key: string,
  cutoffDate: string,
): Promise<BiomarkerTrendPoint[]> {
  const result = await db
    .prepare(
      `SELECT r.date, m.value
       FROM (
         SELECT m.reading_id, MAX(m.id) AS measurement_id
         FROM measurements m
         JOIN readings filtered_readings ON filtered_readings.id = m.reading_id
         WHERE m.vocabulary_key = ? AND filtered_readings.date >= ?
         GROUP BY m.reading_id
       ) selected
       JOIN measurements m ON m.id = selected.measurement_id
       JOIN readings r ON r.id = selected.reading_id
       ORDER BY r.date, r.id`,
    )
    .bind(key, cutoffDate)
    .all<BiomarkerTrendRow>();
  return await decodeRows(
    BiomarkerTrendRow,
    resultsOf("biomarker-trend", result),
  );
}

export async function getReadingsWithMeasurements(
  db: D1Database,
): Promise<ReadingWithMeasurements[]> {
  const [readings, measurements] = await db.batch([
    db.prepare("SELECT id, date, source FROM readings ORDER BY date DESC"),
    db.prepare(
      "SELECT id, reading_id, vocabulary_key, value, unit, status FROM measurements",
    ),
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

  const [metricResults, configResults] = await db.batch([
    metricsQuery,
    db.prepare(
      "SELECT metric, label, unit, aggregation, visible FROM health_metric_config WHERE visible = 1 ORDER BY label",
    ),
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
