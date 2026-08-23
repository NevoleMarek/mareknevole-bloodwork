import * as Schema from "effect/Schema";

export const StatusSchema = Schema.Literals([
  "normal",
  "borderline",
  "high",
  "low",
]);

export const HealthAggregationSchema = Schema.Literals([
  "avg",
  "sum",
  "duration",
]);

const ReferenceRangeSchema = Schema.Struct({
  min: Schema.Number,
  max: Schema.Number,
});

export const VocabularyEntrySchema = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  referenceRange: ReferenceRangeSchema,
  description: Schema.NullOr(Schema.String),
  featured: Schema.Boolean,
  visible: Schema.Boolean,
});

export const VocabularyResponseSchema = Schema.Struct({
  entries: Schema.mutable(Schema.Array(VocabularyEntrySchema)),
});

const MeasurementSchema = Schema.Struct({
  vocabularyKey: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
  status: StatusSchema,
});

const ReadingSummarySchema = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  source: Schema.String,
  measurementCount: Schema.Number,
});

const ReadingCursorSchema = Schema.Struct({
  date: Schema.String,
  id: Schema.String,
});

export const ReadingPageSchema = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ReadingSummarySchema)),
  nextCursor: Schema.NullOr(ReadingCursorSchema),
});

const BloodworkReadingSchema = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(MeasurementSchema)),
});

export const ExportDataSchema = Schema.Struct({
  vocabulary: VocabularyResponseSchema,
  readings: Schema.mutable(Schema.Array(BloodworkReadingSchema)),
});

const BiomarkerTrendPointSchema = Schema.Struct({
  date: Schema.String,
  value: Schema.Number,
});

export const BiomarkerTrendResponseSchema = Schema.Struct({
  points: Schema.mutable(Schema.Array(BiomarkerTrendPointSchema)),
});

const ChangelogCursorSchema = Schema.Struct({
  date: Schema.String,
  createdAt: Schema.String,
  id: Schema.String,
});

const SupplementChangelogSchema = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  description: Schema.String,
  createdAt: Schema.String,
});

export const ChangelogPageSchema = Schema.Struct({
  entries: Schema.mutable(Schema.Array(SupplementChangelogSchema)),
  nextCursor: Schema.NullOr(ChangelogCursorSchema),
});

const SupplementSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  stoppedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const SupplementsResponseSchema = Schema.Struct({
  supplements: Schema.mutable(Schema.Array(SupplementSchema)),
  changelog: Schema.mutable(Schema.Array(SupplementChangelogSchema)),
});

const HealthMetricSchema = Schema.Struct({
  date: Schema.String,
  metric: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
});

export const HealthMetricConfigSchema = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: HealthAggregationSchema,
  visible: Schema.Boolean,
});

export const HealthDataSchema = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetricSchema)),
  configs: Schema.mutable(Schema.Array(HealthMetricConfigSchema)),
});

export const HealthMetricConfigsSchema = Schema.mutable(
  Schema.Array(HealthMetricConfigSchema),
);

export const HealthImportRequestSchema = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetricSchema)),
  configs: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        metric: Schema.String,
        label: Schema.String,
        unit: Schema.String,
        aggregation: Schema.String,
      }),
    ),
  ),
});

export const HealthImportResponseSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  metrics: Schema.optional(Schema.Number),
  days: Schema.optional(Schema.Number),
});

const ExtractedVariableSchema = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  unit: Schema.String,
});

const MappedVariableSchema = Schema.Struct({
  label: Schema.String,
  originalValue: Schema.Number,
  originalUnit: Schema.String,
  vocabularyKey: Schema.String,
  convertedValue: Schema.Number,
  convertedUnit: Schema.String,
  isNew: Schema.Boolean,
  referenceRange: Schema.optional(ReferenceRangeSchema),
});

const ResearchEntrySchema = Schema.Struct({
  vocabularyKey: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  referenceRange: ReferenceRangeSchema,
});

const ResearchedEntrySchema = Schema.Struct({
  vocabularyKey: Schema.String,
  description: Schema.String,
  referenceRange: ReferenceRangeSchema,
});

export const ExtractResponseSchema = Schema.Struct({
  date: Schema.String,
  variables: Schema.mutable(Schema.Array(ExtractedVariableSchema)),
});

export const MapRequestSchema = Schema.Struct({
  variables: Schema.mutable(Schema.Array(ExtractedVariableSchema)),
  vocabulary: Schema.mutable(Schema.Array(VocabularyEntrySchema)),
});

export const MapResponseSchema = Schema.Struct({
  mappings: Schema.mutable(Schema.Array(MappedVariableSchema)),
});

export const ResearchRequestSchema = Schema.Struct({
  newEntries: Schema.mutable(Schema.Array(ResearchEntrySchema)),
});

export const ResearchResponseSchema = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ResearchedEntrySchema)),
});

export const SaveReadingRequestSchema = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(MeasurementSchema)),
  newVocabulary: Schema.mutable(Schema.Array(VocabularyEntrySchema)),
});

export const IdRequestSchema = Schema.Struct({ id: Schema.String });
export const KeyRequestSchema = Schema.Struct({ key: Schema.String });
export const ChangelogUpdateRequestSchema = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
});
export const HealthVisibilityRequestSchema = Schema.Struct({
  metric: Schema.String,
  visible: Schema.Boolean,
});
export const VocabularyEntryRequestSchema = Schema.Struct({
  entry: VocabularyEntrySchema,
});
export const SupplementCreateRequestSchema = Schema.Struct({
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
});
export const SupplementUpdateRequestSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
});
export const SupplementDeleteRequestSchema = Schema.Struct({
  id: Schema.String,
  changelogDate: Schema.String,
});
