import * as Schema from "effect/Schema";

export const StatusSchema = Schema.Literals([
  "normal",
  "borderline",
  "high",
  "low",
]);
export type Status = typeof StatusSchema.Type;

export const HealthAggregationSchema = Schema.Literals([
  "avg",
  "sum",
  "duration",
]);
export type HealthAggregation = typeof HealthAggregationSchema.Type;

export const ReferenceRange = Schema.Struct({
  min: Schema.Number,
  max: Schema.Number,
});
export interface ReferenceRange extends Schema.Schema.Type<
  typeof ReferenceRange
> {
  readonly _schemaModel?: never;
}

export const VocabularyEntry = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  referenceRange: ReferenceRange,
  description: Schema.NullOr(Schema.String),
  featured: Schema.Boolean,
  visible: Schema.Boolean,
});
export interface VocabularyEntry extends Schema.Schema.Type<
  typeof VocabularyEntry
> {
  readonly _schemaModel?: never;
}

export const Measurement = Schema.Struct({
  vocabularyKey: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
  status: StatusSchema,
});
export interface Measurement extends Schema.Schema.Type<typeof Measurement> {
  readonly _schemaModel?: never;
}

export const BloodworkReading = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(Measurement)),
});
export interface BloodworkReading extends Schema.Schema.Type<
  typeof BloodworkReading
> {
  readonly _schemaModel?: never;
}

export const ReadingSummary = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
  measurementCount: Schema.Number,
});
export interface ReadingSummary extends Schema.Schema.Type<
  typeof ReadingSummary
> {
  readonly _schemaModel?: never;
}

export const ReadingCursor = Schema.Struct({
  date: Schema.String,
  id: Schema.String,
});
export interface ReadingCursor extends Schema.Schema.Type<
  typeof ReadingCursor
> {
  readonly _schemaModel?: never;
}

export const ReadingPage = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ReadingSummary)),
  nextCursor: Schema.NullOr(ReadingCursor),
});
export interface ReadingPage extends Schema.Schema.Type<typeof ReadingPage> {
  readonly _schemaModel?: never;
}

export const BiomarkerTrendPoint = Schema.Struct({
  date: Schema.String,
  value: Schema.Number,
});
export interface BiomarkerTrendPoint extends Schema.Schema.Type<
  typeof BiomarkerTrendPoint
> {
  readonly _schemaModel?: never;
}

export const Supplement = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  stoppedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
export interface Supplement extends Schema.Schema.Type<typeof Supplement> {
  readonly _schemaModel?: never;
}

export const SupplementChangelog = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  description: Schema.String,
  createdAt: Schema.String,
});
export interface SupplementChangelog extends Schema.Schema.Type<
  typeof SupplementChangelog
> {
  readonly _schemaModel?: never;
}

export const ChangelogCursor = Schema.Struct({
  date: Schema.String,
  createdAt: Schema.String,
  id: Schema.String,
});
export interface ChangelogCursor extends Schema.Schema.Type<
  typeof ChangelogCursor
> {
  readonly _schemaModel?: never;
}

export const ChangelogPage = Schema.Struct({
  entries: Schema.mutable(Schema.Array(SupplementChangelog)),
  nextCursor: Schema.NullOr(ChangelogCursor),
});
export interface ChangelogPage extends Schema.Schema.Type<
  typeof ChangelogPage
> {
  readonly _schemaModel?: never;
}

export const HealthMetric = Schema.Struct({
  date: Schema.String,
  metric: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
});
export interface HealthMetric extends Schema.Schema.Type<typeof HealthMetric> {
  readonly _schemaModel?: never;
}

export const HealthMetricConfig = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: HealthAggregationSchema,
  visible: Schema.Boolean,
});
export interface HealthMetricConfig extends Schema.Schema.Type<
  typeof HealthMetricConfig
> {
  readonly _schemaModel?: never;
}

export const HealthData = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetric)),
  configs: Schema.mutable(Schema.Array(HealthMetricConfig)),
});
export interface HealthData extends Schema.Schema.Type<typeof HealthData> {
  readonly _schemaModel?: never;
}

export const ExtractedVariable = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
});
export interface ExtractedVariable extends Schema.Schema.Type<
  typeof ExtractedVariable
> {
  readonly _schemaModel?: never;
}

export const MappedVariable = Schema.Struct({
  label: Schema.String,
  originalValue: Schema.Number,
  originalUnit: Schema.String,
  vocabularyKey: Schema.String,
  convertedValue: Schema.Number,
  convertedUnit: Schema.String,
  isNew: Schema.Boolean,
  referenceRange: Schema.optional(ReferenceRange),
});
export interface MappedVariable extends Schema.Schema.Type<
  typeof MappedVariable
> {
  readonly _schemaModel?: never;
}

export const ResearchEntry = Schema.Struct({
  vocabularyKey: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  referenceRange: ReferenceRange,
});
export interface ResearchEntry extends Schema.Schema.Type<
  typeof ResearchEntry
> {
  readonly _schemaModel?: never;
}

export const ResearchedEntry = Schema.Struct({
  vocabularyKey: Schema.String,
  description: Schema.String,
  referenceRange: ReferenceRange,
});
export interface ResearchedEntry extends Schema.Schema.Type<
  typeof ResearchedEntry
> {
  readonly _schemaModel?: never;
}
