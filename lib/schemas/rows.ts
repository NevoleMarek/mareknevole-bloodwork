import * as Schema from "effect/Schema";

import { HealthAggregationSchema, StatusSchema } from "@/lib/schemas/domain";

export const VocabularyRow = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  reference_min: Schema.Number,
  reference_max: Schema.Number,
  description: Schema.NullOr(Schema.String),
  featured: Schema.Number,
  visible: Schema.Number,
});
export interface VocabularyRow extends Schema.Schema.Type<
  typeof VocabularyRow
> {
  readonly _schemaModel?: never;
}

export const ReadingRow = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
});
export interface ReadingRow extends Schema.Schema.Type<typeof ReadingRow> {
  readonly _schemaModel?: never;
}

export const MeasurementRow = Schema.Struct({
  id: Schema.String,
  reading_id: Schema.String,
  vocabulary_key: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
  status: StatusSchema,
});
export interface MeasurementRow extends Schema.Schema.Type<
  typeof MeasurementRow
> {
  readonly _schemaModel?: never;
}

/** State needed to classify a vocabulary update without losing history. */
export const VocabularyMutationStateRow = Schema.Struct({
  key: Schema.String,
  unit: Schema.String,
  reference_min: Schema.Number,
  reference_max: Schema.Number,
  has_measurements: Schema.Number,
});
export interface VocabularyMutationStateRow extends Schema.Schema.Type<
  typeof VocabularyMutationStateRow
> {
  readonly _schemaModel?: never;
}

export const SupplementRow = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  started_at: Schema.String,
  stopped_at: Schema.NullOr(Schema.String),
  created_at: Schema.String,
  updated_at: Schema.String,
});
export interface SupplementRow extends Schema.Schema.Type<
  typeof SupplementRow
> {
  readonly _schemaModel?: never;
}

export const SupplementChangelogRow = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  description: Schema.String,
  created_at: Schema.String,
});
export interface SupplementChangelogRow extends Schema.Schema.Type<
  typeof SupplementChangelogRow
> {
  readonly _schemaModel?: never;
}

export const HealthMetricRow = Schema.Struct({
  date: Schema.String,
  metric: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
});
export interface HealthMetricRow extends Schema.Schema.Type<
  typeof HealthMetricRow
> {
  readonly _schemaModel?: never;
}

export const HealthMetricConfigRow = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: HealthAggregationSchema,
  visible: Schema.Number,
});
export interface HealthMetricConfigRow extends Schema.Schema.Type<
  typeof HealthMetricConfigRow
> {
  readonly _schemaModel?: never;
}

export const ReadingCountRow = Schema.Struct({ count: Schema.Number });
export interface ReadingCountRow extends Schema.Schema.Type<
  typeof ReadingCountRow
> {
  readonly _schemaModel?: never;
}

export const ReadingSummaryRow = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
  measurement_count: Schema.Number,
});
export interface ReadingSummaryRow extends Schema.Schema.Type<
  typeof ReadingSummaryRow
> {
  readonly _schemaModel?: never;
}

export const BiomarkerTrendRow = Schema.Struct({
  date: Schema.String,
  value: Schema.Number,
});
export interface BiomarkerTrendRow extends Schema.Schema.Type<
  typeof BiomarkerTrendRow
> {
  readonly _schemaModel?: never;
}

export const SupplementUpdateRow = Schema.Struct({
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  started_at: Schema.String,
});
export interface SupplementUpdateRow extends Schema.Schema.Type<
  typeof SupplementUpdateRow
> {
  readonly _schemaModel?: never;
}

export const SupplementNameRow = Schema.Struct({ name: Schema.String });
export interface SupplementNameRow extends Schema.Schema.Type<
  typeof SupplementNameRow
> {
  readonly _schemaModel?: never;
}
