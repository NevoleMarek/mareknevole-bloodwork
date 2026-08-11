/// <reference types="@cloudflare/workers-types" />

import type {
  BiomarkerTrendPoint,
  ChangelogCursor,
  ChangelogPage,
  Measurement,
  ReadingCursor,
  ReadingPage,
  Supplement,
  SupplementChangelog,
  VocabularyEntry,
} from "@/types/bloodwork";
import type { HealthMetric, HealthMetricConfig } from "@/types/health";

// -- Row types (snake_case, matching D1 columns) --

type VocabularyRow = {
  key: string;
  label: string;
  unit: string;
  reference_min: number;
  reference_max: number;
  description: string | null;
  featured: number;
  visible: number;
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

type HealthMetricRow = {
  date: string;
  metric: string;
  value: number;
  unit: string;
};

type HealthMetricConfigRow = {
  metric: string;
  label: string;
  unit: string;
  aggregation: string;
  visible: number;
};

type ReadingCountRow = {
  count: number;
};

type ReadingSummaryRow = ReadingRow & {
  measurement_count: number;
};

type BiomarkerTrendRow = {
  date: string;
  value: number;
};

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

export function mapHealthMetricConfigRow(
  row: HealthMetricConfigRow,
): HealthMetricConfig {
  return {
    metric: row.metric,
    label: row.label,
    unit: row.unit,
    aggregation: row.aggregation as HealthMetricConfig["aggregation"],
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

export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const result = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max, description, featured, visible FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  return resultsOf("vocabulary", result).map(mapVocabularyRow);
}

type ReadingWithMeasurements = ReadingRow & { measurements: Measurement[] };

export async function getLabOverview(db: D1Database): Promise<{
  latestPanel: { date: string; source: string } | null;
  latestMeasurements: Measurement[];
  panelCount: number;
}> {
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
  const latest = resultsOf("latest-reading", latestResult)[0];
  const panelCount = resultsOf("reading-count", countResult)[0].count;
  return {
    latestPanel: latest ? { date: latest.date, source: latest.source } : null,
    latestMeasurements: resultsOf("latest-measurements", measurementResult).map(
      mapMeasurementRow,
    ),
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
  return resultsOf("biomarker-trend", result);
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
  for (const row of resultsOf("measurements", measurements)) {
    const list = byReading.get(row.reading_id) ?? [];
    list.push(mapMeasurementRow(row));
    byReading.set(row.reading_id, list);
  }

  return resultsOf("readings", readings).map((r) => ({
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
  const rows = resultsOf("reading-page", result);
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
  return resultsOf("active-supplements", result).map(mapSupplementRow);
}

export async function getSupplementChangelog(
  db: D1Database,
): Promise<SupplementChangelog[]> {
  const result = await db
    .prepare(
      "SELECT * FROM supplement_changelog ORDER BY date DESC, created_at DESC, id DESC",
    )
    .all<SupplementChangelogRow>();
  return resultsOf("supplement-changelog", result).map(
    mapSupplementChangelogRow,
  );
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
  const rows = resultsOf("supplement-changelog-page", result);
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
): Promise<{ metrics: HealthMetric[]; configs: HealthMetricConfig[] }> {
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
    metrics: resultsOf("visible-health-metrics", metricResults),
    configs: resultsOf("visible-health-config", configResults).map(
      mapHealthMetricConfigRow,
    ),
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
  return resultsOf("health-config", result).map(mapHealthMetricConfigRow);
}
