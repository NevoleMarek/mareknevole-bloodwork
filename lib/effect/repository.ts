import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import {
  getActiveSupplements,
  getBiomarkerTrend,
  getHealthMetricConfigs,
  getLabOverview,
  getReadingPage,
  getReadingsWithMeasurements,
  getSupplementChangelogPage,
  getVisibleHealthMetrics,
  getVocabulary,
} from "@/db/queries";
import type {
  BiomarkerTrendPoint,
  ChangelogCursor,
  ChangelogPage,
  LabOverview,
  ReadingCursor,
  ReadingPage,
  ReadingWithMeasurements,
  Supplement,
  SupplementCreateInput,
  SupplementDeleteInput,
  SupplementUpdateInput,
  VocabularyEntry,
  HealthImportConfig,
} from "@/types/bloodwork";
import { getCutoffDate } from "@/lib/period";
import type { TrendPeriod } from "@/lib/period";
import type {
  HealthData,
  HealthMetric,
  HealthMetricConfig,
} from "@/types/health";
import type { SaveReadingRequest } from "@/types/wizard";
import {
  ConflictError,
  NotFoundError,
  PersistenceError,
  ValidationError,
} from "@/lib/effect/errors";
import {
  SupplementNameRow,
  SupplementUpdateRow,
  VocabularyMutationStateRow,
} from "@/lib/schemas/rows";
import { CloudflareRuntime } from "@/lib/effect/runtime";

export interface RepositoryContract {
  readonly getVocabulary: () => Effect.Effect<
    VocabularyEntry[],
    PersistenceError
  >;
  readonly getLabOverview: () => Effect.Effect<LabOverview, PersistenceError>;
  readonly getBiomarkerTrend: (
    key: string,
    period: TrendPeriod,
  ) => Effect.Effect<BiomarkerTrendPoint[], PersistenceError>;
  readonly getReadingsWithMeasurements: () => Effect.Effect<
    ReadingWithMeasurements[],
    PersistenceError
  >;
  readonly getReadingPage: (
    cursor: ReadingCursor | null,
  ) => Effect.Effect<ReadingPage, PersistenceError>;
  readonly getActiveSupplements: () => Effect.Effect<
    Supplement[],
    PersistenceError
  >;
  readonly getSupplementChangelogPage: (
    cursor: ChangelogCursor | null,
  ) => Effect.Effect<ChangelogPage, PersistenceError>;
  readonly getVisibleHealthMetrics: (
    cutoffDate: string | null,
  ) => Effect.Effect<HealthData, PersistenceError>;
  readonly getHealthMetricConfigs: () => Effect.Effect<
    HealthMetricConfig[],
    PersistenceError
  >;
  readonly getVisibleVocabularyKeys: () => Effect.Effect<
    string[],
    PersistenceError
  >;
  readonly updateChangelog: (
    id: string,
    description: string,
  ) => Effect.Effect<void, PersistenceError | NotFoundError>;
  readonly deleteChangelog: (
    id: string,
  ) => Effect.Effect<void, PersistenceError>;
  readonly updateHealthVisibility: (
    metric: string,
    visible: boolean,
  ) => Effect.Effect<void, PersistenceError>;
  readonly importHealth: (
    metrics: HealthMetric[],
    configs: ReadonlyArray<HealthImportConfig>,
  ) => Effect.Effect<void, PersistenceError>;
  readonly deleteReading: (
    id: string,
  ) => Effect.Effect<void, PersistenceError | NotFoundError>;
  readonly saveReading: (
    body: SaveReadingRequest,
  ) => Effect.Effect<
    string,
    PersistenceError | ConflictError | ValidationError
  >;
  readonly createVocabulary: (
    entry: VocabularyEntry,
  ) => Effect.Effect<void, PersistenceError | ConflictError>;
  readonly updateVocabulary: (
    entry: VocabularyEntry,
  ) => Effect.Effect<void, PersistenceError | NotFoundError | ConflictError>;
  readonly deleteVocabulary: (
    key: string,
  ) => Effect.Effect<void, PersistenceError>;
  readonly createSupplement: (
    input: SupplementCreateInput,
  ) => Effect.Effect<void, PersistenceError | ConflictError>;
  readonly updateSupplement: (
    input: SupplementUpdateInput,
  ) => Effect.Effect<void, PersistenceError | NotFoundError>;
  readonly deleteSupplement: (
    input: SupplementDeleteInput,
  ) => Effect.Effect<void, PersistenceError | NotFoundError>;
}

export class Repository extends Context.Service<
  Repository,
  RepositoryContract
>()("Bloodwork/Repository") {}

const d1 = <A>(
  operation: string,
  execute: (database: D1Database) => Promise<A>,
  database: D1Database,
): Effect.Effect<A, PersistenceError> =>
  Effect.tryPromise({
    try: () => execute(database),
    catch: (cause) => new PersistenceError({ operation, cause }),
  });

const d1Mutation = <A>(
  operation: string,
  execute: (database: D1Database) => Promise<A>,
  database: D1Database,
  conflict: { readonly resource: string; readonly id: string },
): Effect.Effect<A, PersistenceError | ConflictError> =>
  Effect.tryPromise({
    try: () => execute(database),
    catch: (cause) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      return /constraint|unique/i.test(message)
        ? new ConflictError(conflict)
        : new PersistenceError({ operation, cause });
    },
  });

const decodePersisted = <S extends Schema.ConstraintDecoder<unknown, never>>(
  schema: S,
  value: Schema.Json,
  operation: string,
): Effect.Effect<S["Type"], PersistenceError> =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new PersistenceError({ operation, cause })),
  );

export const makeRepository = (database: D1Database) => {
  const getVocabularyEffect = Effect.fn("Repository.getVocabulary")(
    function* () {
      return yield* d1("Repository.getVocabulary", getVocabulary, database);
    },
  );
  const getLabOverviewEffect = Effect.fn("Repository.getLabOverview")(
    function* () {
      return yield* d1("Repository.getLabOverview", getLabOverview, database);
    },
  );
  const getBiomarkerTrendEffect = Effect.fn("Repository.getBiomarkerTrend")(
    function* (key: string, period: TrendPeriod) {
      return yield* d1(
        "Repository.getBiomarkerTrend",
        (db) => getBiomarkerTrend(db, key, getCutoffDate(period)),
        database,
      );
    },
  );
  const getReadingsEffect = Effect.fn("Repository.getReadingsWithMeasurements")(
    function* () {
      return yield* d1(
        "Repository.getReadingsWithMeasurements",
        getReadingsWithMeasurements,
        database,
      );
    },
  );
  const getReadingPageEffect = Effect.fn("Repository.getReadingPage")(
    function* (cursor: ReadingCursor | null) {
      return yield* d1(
        "Repository.getReadingPage",
        (db) => getReadingPage(db, cursor),
        database,
      );
    },
  );
  const getActiveSupplementsEffect = Effect.fn(
    "Repository.getActiveSupplements",
  )(function* () {
    return yield* d1(
      "Repository.getActiveSupplements",
      getActiveSupplements,
      database,
    );
  });
  const getSupplementChangelogPageEffect = Effect.fn(
    "Repository.getSupplementChangelogPage",
  )(function* (cursor: ChangelogCursor | null) {
    return yield* d1(
      "Repository.getSupplementChangelogPage",
      (db) => getSupplementChangelogPage(db, cursor),
      database,
    );
  });
  const getVisibleHealthMetricsEffect = Effect.fn(
    "Repository.getVisibleHealthMetrics",
  )(function* (cutoffDate: string | null) {
    return yield* d1(
      "Repository.getVisibleHealthMetrics",
      (db) => getVisibleHealthMetrics(db, cutoffDate),
      database,
    );
  });
  const getHealthMetricConfigsEffect = Effect.fn(
    "Repository.getHealthMetricConfigs",
  )(function* () {
    return yield* d1(
      "Repository.getHealthMetricConfigs",
      getHealthMetricConfigs,
      database,
    );
  });
  const getVisibleVocabularyKeysEffect = Effect.fn(
    "Repository.getVisibleVocabularyKeys",
  )(function* () {
    const vocabulary = yield* getVocabularyEffect();
    return vocabulary
      .filter((entry) => entry.visible)
      .map((entry) => entry.key);
  });

  const updateChangelogEffect = Effect.fn("Repository.updateChangelog")(
    function* (id: string, description: string) {
      const result = yield* d1(
        "Repository.updateChangelog",
        (db) =>
          db
            .prepare(
              "UPDATE supplement_changelog SET description = ? WHERE id = ?",
            )
            .bind(description, id)
            .run(),
        database,
      );
      if (result.meta.changes === 0) {
        return yield* Effect.fail(
          new NotFoundError({ resource: "supplement-changelog", id }),
        );
      }
    },
  );
  const deleteChangelogEffect = Effect.fn("Repository.deleteChangelog")(
    function* (id: string) {
      yield* d1(
        "Repository.deleteChangelog",
        (db) =>
          db
            .prepare("DELETE FROM supplement_changelog WHERE id = ?")
            .bind(id)
            .run(),
        database,
      );
    },
  );
  const updateHealthVisibilityEffect = Effect.fn(
    "Repository.updateHealthVisibility",
  )(function* (metric: string, visible: boolean) {
    yield* d1(
      "Repository.updateHealthVisibility",
      (db) =>
        db
          .prepare(
            "UPDATE health_metric_config SET visible = ? WHERE metric = ?",
          )
          .bind(visible ? 1 : 0, metric)
          .run(),
      database,
    );
  });
  const importHealthEffect = Effect.fn("Repository.importHealth")(function* (
    metrics: HealthMetric[],
    configs: ReadonlyArray<HealthImportConfig>,
  ) {
    yield* d1(
      "Repository.importHealth",
      (db) => {
        const configStatements = configs.map((config) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO health_metric_config (metric, label, unit, aggregation, visible) VALUES (?, ?, ?, ?, 0)",
            )
            .bind(config.metric, config.label, config.unit, config.aggregation),
        );
        const metricStatements = metrics.map((metric) =>
          db
            .prepare(
              "INSERT OR REPLACE INTO health_metrics (date, metric, value, unit) VALUES (?, ?, ?, ?)",
            )
            .bind(metric.date, metric.metric, metric.value, metric.unit),
        );
        return db.batch([...configStatements, ...metricStatements]);
      },
      database,
    );
  });
  const deleteReadingEffect = Effect.fn("Repository.deleteReading")(function* (
    id: string,
  ) {
    const result = yield* d1(
      "Repository.deleteReading",
      (db) => db.prepare("DELETE FROM readings WHERE id = ?").bind(id).run(),
      database,
    );
    if (result.meta.changes === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "reading", id }));
    }
  });
  const saveReadingEffect = Effect.fn("Repository.saveReading")(function* (
    body: SaveReadingRequest,
  ) {
    if (body.measurements.length === 0) {
      return yield* Effect.fail(
        new ValidationError({
          operation: "Repository.saveReading",
          message: "At least one measurement is required",
        }),
      );
    }
    const readingId = crypto.randomUUID();
    yield* d1Mutation(
      "Repository.saveReading",
      (db) => {
        const statements: D1PreparedStatement[] = [];
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
        statements.push(
          db
            .prepare("INSERT INTO readings (id, date, source) VALUES (?, ?, ?)")
            .bind(readingId, body.date, body.source),
        );
        for (const measurement of body.measurements) {
          statements.push(
            db
              .prepare(
                "INSERT INTO measurements (id, reading_id, vocabulary_key, value, unit, status, reading_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
              )
              .bind(
                crypto.randomUUID(),
                readingId,
                measurement.vocabularyKey,
                measurement.value,
                measurement.unit,
                measurement.status,
                body.date,
              ),
          );
        }
        return db.batch(statements).then(() => readingId);
      },
      database,
      { resource: "reading", id: readingId },
    );
    return readingId;
  });
  const createVocabularyEffect = Effect.fn("Repository.createVocabulary")(
    function* (entry: VocabularyEntry) {
      yield* d1Mutation(
        "Repository.createVocabulary",
        (db) =>
          db
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
            .run(),
        database,
        { resource: "vocabulary", id: entry.key },
      );
    },
  );
  const updateVocabularyEffect = Effect.fn("Repository.updateVocabulary")(
    function* (entry: VocabularyEntry) {
      const result = yield* d1(
        "Repository.updateVocabulary",
        (db) =>
          db
            .prepare(
              `UPDATE vocabulary
               SET label = ?, unit = ?, reference_min = ?, reference_max = ?, description = ?, featured = ?, visible = ?
               WHERE key = ?
                 AND (
                   (unit = ? AND reference_min = ? AND reference_max = ?)
                   OR NOT EXISTS (
                     SELECT 1
                     FROM measurements
                     WHERE measurements.vocabulary_key = ?
                   )
                 )`,
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
              entry.unit,
              entry.referenceRange.min,
              entry.referenceRange.max,
              entry.key,
            )
            .run(),
        database,
      );
      if (result.meta.changes !== 0) return;

      // The guarded UPDATE distinguishes a missing key from an attempted
      // unit/range change after measurements already exist. This keeps a
      // vocabulary's interpretation stable for every stored measurement.
      const stateUnknown = yield* d1(
        "Repository.updateVocabulary.state",
        (db) =>
          db
            .prepare(
              `SELECT key, unit, reference_min, reference_max,
                      EXISTS (
                        SELECT 1
                        FROM measurements
                        WHERE measurements.vocabulary_key = vocabulary.key
                      ) AS has_measurements
               FROM vocabulary
               WHERE key = ?`,
            )
            .bind(entry.key)
            .first<Schema.Json>(),
        database,
      );
      const state = stateUnknown
        ? yield* decodePersisted(
            VocabularyMutationStateRow,
            stateUnknown,
            "Repository.updateVocabulary.decode",
          )
        : null;
      if (!state) {
        return yield* Effect.fail(
          new NotFoundError({ resource: "vocabulary", id: entry.key }),
        );
      }

      const metadataChanged =
        state.unit !== entry.unit ||
        state.reference_min !== entry.referenceRange.min ||
        state.reference_max !== entry.referenceRange.max;
      if (metadataChanged && state.has_measurements !== 0) {
        return yield* Effect.fail(
          new ConflictError({ resource: "vocabulary", id: entry.key }),
        );
      }
    },
  );
  const deleteVocabularyEffect = Effect.fn("Repository.deleteVocabulary")(
    function* (key: string) {
      yield* d1(
        "Repository.deleteVocabulary",
        (db) =>
          db.prepare("DELETE FROM vocabulary WHERE key = ?").bind(key).run(),
        database,
      );
    },
  );
  const createSupplementEffect = Effect.fn("Repository.createSupplement")(
    function* (input: SupplementCreateInput) {
      const now = new Date().toISOString();
      yield* d1Mutation(
        "Repository.createSupplement",
        (db) =>
          db
            .prepare(
              "INSERT INTO supplements (id, name, dose, frequency, started_at, stopped_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)",
            )
            .bind(
              crypto.randomUUID(),
              input.name,
              input.dose,
              input.frequency,
              input.startedAt,
              now,
              now,
            )
            .run()
            .then(() =>
              db
                .prepare(
                  "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
                )
                .bind(
                  crypto.randomUUID(),
                  input.changelogDate,
                  `Added ${input.name} ${input.dose}`,
                  now,
                )
                .run(),
            ),
        database,
        { resource: "supplement", id: input.name },
      );
    },
  );
  const updateSupplementEffect = Effect.fn("Repository.updateSupplement")(
    function* (input: SupplementUpdateInput) {
      const oldUnknown = yield* d1(
        "Repository.updateSupplement.read",
        (db) =>
          db
            .prepare("SELECT * FROM supplements WHERE id = ?")
            .bind(input.id)
            .first<Schema.Json>(),
        database,
      );
      const old = oldUnknown
        ? yield* decodePersisted(
            SupplementUpdateRow,
            oldUnknown,
            "Repository.updateSupplement.decode",
          )
        : null;
      if (!old) {
        return yield* Effect.fail(
          new NotFoundError({ resource: "supplement", id: input.id }),
        );
      }
      const now = new Date().toISOString();
      const changes: string[] = [];
      if (old.dose !== input.dose)
        changes.push(
          `Changed ${old.name} dose from ${old.dose} to ${input.dose}`,
        );
      if (old.frequency !== input.frequency)
        changes.push(`Changed ${old.name} frequency to ${input.frequency}`);
      if (old.name !== input.name)
        changes.push(`Renamed ${old.name} to ${input.name}`);
      if (old.started_at !== input.startedAt)
        changes.push(`Changed ${old.name} start date to ${input.startedAt}`);
      yield* d1(
        "Repository.updateSupplement",
        (db) =>
          db
            .prepare(
              "UPDATE supplements SET name = ?, dose = ?, frequency = ?, started_at = ?, updated_at = ? WHERE id = ?",
            )
            .bind(
              input.name,
              input.dose,
              input.frequency,
              input.startedAt,
              now,
              input.id,
            )
            .run()
            .then(async () => {
              for (const description of changes) {
                await db
                  .prepare(
                    "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
                  )
                  .bind(
                    crypto.randomUUID(),
                    input.changelogDate,
                    description,
                    now,
                  )
                  .run();
              }
            }),
        database,
      );
    },
  );
  const deleteSupplementEffect = Effect.fn("Repository.deleteSupplement")(
    function* (input: SupplementDeleteInput) {
      const supplementUnknown = yield* d1(
        "Repository.deleteSupplement.read",
        (db) =>
          db
            .prepare("SELECT name FROM supplements WHERE id = ?")
            .bind(input.id)
            .first<Schema.Json>(),
        database,
      );
      const supplement = supplementUnknown
        ? yield* decodePersisted(
            SupplementNameRow,
            supplementUnknown,
            "Repository.deleteSupplement.decode",
          )
        : null;
      if (!supplement) {
        return yield* Effect.fail(
          new NotFoundError({ resource: "supplement", id: input.id }),
        );
      }
      const now = new Date().toISOString();
      yield* d1(
        "Repository.deleteSupplement",
        (db) =>
          db
            .prepare(
              "UPDATE supplements SET stopped_at = ?, updated_at = ? WHERE id = ?",
            )
            .bind(now, now, input.id)
            .run()
            .then(() =>
              db
                .prepare(
                  "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
                )
                .bind(
                  crypto.randomUUID(),
                  input.changelogDate,
                  `Removed ${supplement.name}`,
                  now,
                )
                .run(),
            ),
        database,
      );
    },
  );

  return Repository.of({
    getVocabulary: getVocabularyEffect,
    getLabOverview: getLabOverviewEffect,
    getBiomarkerTrend: getBiomarkerTrendEffect,
    getReadingsWithMeasurements: getReadingsEffect,
    getReadingPage: getReadingPageEffect,
    getActiveSupplements: getActiveSupplementsEffect,
    getSupplementChangelogPage: getSupplementChangelogPageEffect,
    getVisibleHealthMetrics: getVisibleHealthMetricsEffect,
    getHealthMetricConfigs: getHealthMetricConfigsEffect,
    getVisibleVocabularyKeys: getVisibleVocabularyKeysEffect,
    updateChangelog: updateChangelogEffect,
    deleteChangelog: deleteChangelogEffect,
    updateHealthVisibility: updateHealthVisibilityEffect,
    importHealth: importHealthEffect,
    deleteReading: deleteReadingEffect,
    saveReading: saveReadingEffect,
    createVocabulary: createVocabularyEffect,
    updateVocabulary: updateVocabularyEffect,
    deleteVocabulary: deleteVocabularyEffect,
    createSupplement: createSupplementEffect,
    updateSupplement: updateSupplementEffect,
    deleteSupplement: deleteSupplementEffect,
  });
};

export const layer = Layer.effect(
  Repository,
  Effect.gen(function* () {
    const runtime = yield* CloudflareRuntime;
    return makeRepository(runtime.env.DB);
  }),
);
