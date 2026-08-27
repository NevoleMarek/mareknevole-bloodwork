import * as Schema from "effect/Schema";

export const StatusSchema = Schema.Literals([
  "normal",
  "borderline",
  "high",
  "low",
]).annotate({ identifier: "Status" });
export type Status = typeof StatusSchema.Type;

export const HealthAggregationSchema = Schema.Literals([
  "avg",
  "sum",
  "duration",
]).annotate({ identifier: "HealthAggregation" });

export const ReferenceRange = Schema.Struct({
  min: Schema.Number,
  max: Schema.Number,
}).annotate({ identifier: "ReferenceRange" });
export interface ReferenceRange extends Schema.Schema.Type<
  typeof ReferenceRange
> {
  readonly _schemaModel?: never;
}

export const InterpretationSourceSchema = Schema.Literals([
  "ai",
  "manual",
  "legacy",
]).annotate({ identifier: "InterpretationSource" });
export type InterpretationSource = typeof InterpretationSourceSchema.Type;

export const InterpretationReviewStatusSchema = Schema.Literals([
  "unreviewed",
  "pending_review",
  "approved",
]).annotate({ identifier: "InterpretationReviewStatus" });
export type InterpretationReviewStatus =
  typeof InterpretationReviewStatusSchema.Type;

/**
 * The provenance attached to an interpretation is deliberately a value
 * object, so it travels with the vocabulary entry everywhere descriptions are
 * displayed or edited.
 */
export const InterpretationProvenance = Schema.Struct({
  source: InterpretationSourceSchema,
  model: Schema.NullOr(Schema.String),
  generatedAt: Schema.NullOr(Schema.String),
  version: Schema.Number,
  reviewStatus: InterpretationReviewStatusSchema,
  reviewedAt: Schema.NullOr(Schema.String),
  reviewedBy: Schema.NullOr(Schema.String),
  updatedAt: Schema.NullOr(Schema.String),
}).annotate({ identifier: "InterpretationProvenance" });
export interface InterpretationProvenance extends Schema.Schema.Type<
  typeof InterpretationProvenance
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
  interpretation: Schema.optional(InterpretationProvenance),
}).annotate({ identifier: "VocabularyEntry" });
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
}).annotate({ identifier: "Measurement" });
export interface Measurement extends Schema.Schema.Type<typeof Measurement> {
  readonly _schemaModel?: never;
}

export const BloodworkReading = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(Measurement)),
}).annotate({ identifier: "BloodworkReading" });
export interface BloodworkReading extends Schema.Schema.Type<
  typeof BloodworkReading
> {
  readonly _schemaModel?: never;
}

export const ReadingWithMeasurements = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(Measurement)),
}).annotate({ identifier: "ReadingWithMeasurements" });
export interface ReadingWithMeasurements extends Schema.Schema.Type<
  typeof ReadingWithMeasurements
> {
  readonly _schemaModel?: never;
}

export const LatestPanel = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
}).annotate({ identifier: "LatestPanel" });
export interface LatestPanel extends Schema.Schema.Type<typeof LatestPanel> {
  readonly _schemaModel?: never;
}

export const LabOverview = Schema.Struct({
  latestPanel: Schema.NullOr(LatestPanel),
  latestMeasurements: Schema.mutable(Schema.Array(Measurement)),
  panelCount: Schema.Number,
}).annotate({ identifier: "LabOverview" });
export interface LabOverview extends Schema.Schema.Type<typeof LabOverview> {
  readonly _schemaModel?: never;
}

export const ReadingSummary = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
  measurementCount: Schema.Number,
}).annotate({ identifier: "ReadingSummary" });
export interface ReadingSummary extends Schema.Schema.Type<
  typeof ReadingSummary
> {
  readonly _schemaModel?: never;
}

export const ReadingCursor = Schema.Struct({
  date: Schema.String,
  id: Schema.String,
}).annotate({ identifier: "ReadingCursor" });
export interface ReadingCursor extends Schema.Schema.Type<
  typeof ReadingCursor
> {
  readonly _schemaModel?: never;
}

export const ReadingPage = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ReadingSummary)),
  nextCursor: Schema.NullOr(ReadingCursor),
}).annotate({ identifier: "ReadingPage" });
export interface ReadingPage extends Schema.Schema.Type<typeof ReadingPage> {
  readonly _schemaModel?: never;
}

export const BiomarkerTrendPoint = Schema.Struct({
  date: Schema.String,
  value: Schema.Number,
}).annotate({ identifier: "BiomarkerTrendPoint" });
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
}).annotate({ identifier: "Supplement" });
export interface Supplement extends Schema.Schema.Type<typeof Supplement> {
  readonly _schemaModel?: never;
}

export const SupplementChangelog = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  description: Schema.String,
  createdAt: Schema.String,
}).annotate({ identifier: "SupplementChangelog" });
export interface SupplementChangelog extends Schema.Schema.Type<
  typeof SupplementChangelog
> {
  readonly _schemaModel?: never;
}

export const ChangelogCursor = Schema.Struct({
  date: Schema.String,
  createdAt: Schema.String,
  id: Schema.String,
}).annotate({ identifier: "ChangelogCursor" });
export interface ChangelogCursor extends Schema.Schema.Type<
  typeof ChangelogCursor
> {
  readonly _schemaModel?: never;
}

export const ChangelogPage = Schema.Struct({
  entries: Schema.mutable(Schema.Array(SupplementChangelog)),
  nextCursor: Schema.NullOr(ChangelogCursor),
}).annotate({ identifier: "ChangelogPage" });
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
}).annotate({ identifier: "HealthMetric" });
export interface HealthMetric extends Schema.Schema.Type<typeof HealthMetric> {
  readonly _schemaModel?: never;
}

export const HealthMetricConfig = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: HealthAggregationSchema,
  visible: Schema.Boolean,
}).annotate({ identifier: "HealthMetricConfig" });
export interface HealthMetricConfig extends Schema.Schema.Type<
  typeof HealthMetricConfig
> {
  readonly _schemaModel?: never;
}

export const HealthData = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetric)),
  configs: Schema.mutable(Schema.Array(HealthMetricConfig)),
}).annotate({ identifier: "HealthData" });
export interface HealthData extends Schema.Schema.Type<typeof HealthData> {
  readonly _schemaModel?: never;
}

export const DashboardSnapshot = Schema.Struct({
  vocabulary: Schema.mutable(Schema.Array(VocabularyEntry)),
  labs: LabOverview,
  supplements: Schema.mutable(Schema.Array(Supplement)),
}).annotate({ identifier: "DashboardSnapshot" });
export interface DashboardSnapshot extends Schema.Schema.Type<
  typeof DashboardSnapshot
> {
  readonly _schemaModel?: never;
}

export const ExtractedVariable = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
}).annotate({ identifier: "ExtractedVariable" });
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
}).annotate({ identifier: "MappedVariable" });
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
}).annotate({ identifier: "ResearchEntry" });
export interface ResearchEntry extends Schema.Schema.Type<
  typeof ResearchEntry
> {
  readonly _schemaModel?: never;
}

export const ResearchedEntry = Schema.Struct({
  vocabularyKey: Schema.String,
  description: Schema.String,
  referenceRange: ReferenceRange,
  interpretation: Schema.optional(InterpretationProvenance),
}).annotate({ identifier: "ResearchedEntry" });
export interface ResearchedEntry extends Schema.Schema.Type<
  typeof ResearchedEntry
> {
  readonly _schemaModel?: never;
}
