import * as Schema from "effect/Schema";

import {
  BloodworkReading,
  BiomarkerTrendPoint,
  ChangelogPage,
  ExtractedVariable,
  HealthAggregationSchema,
  HealthData,
  HealthMetricConfig,
  HealthMetric,
  MappedVariable,
  Measurement,
  ReferenceRange,
  ResearchedEntry,
  ResearchEntry,
  ReadingPage,
  Supplement,
  VocabularyEntry,
} from "@/lib/schemas/domain";

export const VocabularyResponse = Schema.Struct({
  entries: Schema.mutable(Schema.Array(VocabularyEntry)),
}).annotate({ identifier: "VocabularyResponse" });
export interface VocabularyResponse extends Schema.Schema.Type<
  typeof VocabularyResponse
> {
  readonly _schemaModel?: never;
}

export const ReadingPageResponse = ReadingPage;
export const ExportData = Schema.Struct({
  vocabulary: VocabularyResponse,
  readings: Schema.mutable(Schema.Array(BloodworkReading)),
}).annotate({ identifier: "ExportData" });
export interface ExportData extends Schema.Schema.Type<typeof ExportData> {
  readonly _schemaModel?: never;
}

export const BiomarkerTrendResponse = Schema.Struct({
  points: Schema.mutable(Schema.Array(BiomarkerTrendPoint)),
}).annotate({ identifier: "BiomarkerTrendResponse" });
export interface BiomarkerTrendResponse extends Schema.Schema.Type<
  typeof BiomarkerTrendResponse
> {
  readonly _schemaModel?: never;
}

export const ChangelogPageResponse = ChangelogPage;
export const SupplementsResponse = Schema.Struct({
  supplements: Schema.mutable(Schema.Array(Supplement)),
}).annotate({ identifier: "SupplementsResponse" });
export interface SupplementsResponse extends Schema.Schema.Type<
  typeof SupplementsResponse
> {
  readonly _schemaModel?: never;
}

export const HealthDataResponse = HealthData;
export const HealthMetricConfigs = Schema.mutable(
  Schema.Array(HealthMetricConfig),
).annotate({ identifier: "HealthMetricConfigs" });

export const HealthImportConfig = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: HealthAggregationSchema,
}).annotate({ identifier: "HealthImportConfig" });
export interface HealthImportConfig extends Schema.Schema.Type<
  typeof HealthImportConfig
> {
  readonly _schemaModel?: never;
}

export const HealthImportRequest = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetric)),
  configs: Schema.mutable(Schema.Array(HealthImportConfig)),
}).annotate({ identifier: "HealthImportRequest" });
export interface HealthImportRequest extends Schema.Schema.Type<
  typeof HealthImportRequest
> {
  readonly _schemaModel?: never;
}

export const HealthImportSummary = Schema.Struct({
  saved: Schema.Number,
  metrics: Schema.Number,
  days: Schema.Number,
}).annotate({ identifier: "HealthImportSummary" });
export interface HealthImportSummary extends Schema.Schema.Type<
  typeof HealthImportSummary
> {
  readonly _schemaModel?: never;
}

export const ExtractResponse = Schema.Struct({
  date: Schema.String,
  variables: Schema.mutable(Schema.Array(ExtractedVariable)),
}).annotate({ identifier: "ExtractResponse" });
export interface ExtractResponse extends Schema.Schema.Type<
  typeof ExtractResponse
> {
  readonly _schemaModel?: never;
}

export const MapRequest = Schema.Struct({
  variables: Schema.mutable(Schema.Array(ExtractedVariable)),
  vocabulary: Schema.mutable(Schema.Array(VocabularyEntry)),
}).annotate({ identifier: "MapRequest" });
export interface MapRequest extends Schema.Schema.Type<typeof MapRequest> {
  readonly _schemaModel?: never;
}

export const MapResponse = Schema.Struct({
  mappings: Schema.mutable(Schema.Array(MappedVariable)),
}).annotate({ identifier: "MapResponse" });
export interface MapResponse extends Schema.Schema.Type<typeof MapResponse> {
  readonly _schemaModel?: never;
}

export const ResearchRequest = Schema.Struct({
  newEntries: Schema.mutable(Schema.Array(ResearchEntry)),
}).annotate({ identifier: "ResearchRequest" });
export interface ResearchRequest extends Schema.Schema.Type<
  typeof ResearchRequest
> {
  readonly _schemaModel?: never;
}

export const ResearchResponse = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ResearchedEntry)),
}).annotate({ identifier: "ResearchResponse" });
export interface ResearchResponse extends Schema.Schema.Type<
  typeof ResearchResponse
> {
  readonly _schemaModel?: never;
}

export const SaveReadingRequest = Schema.Struct({
  date: Schema.String,
  source: Schema.String,
  measurements: Schema.mutable(Schema.Array(Measurement)),
  newVocabulary: Schema.mutable(Schema.Array(VocabularyEntry)),
}).annotate({ identifier: "SaveReadingRequest" });
export interface SaveReadingRequest extends Schema.Schema.Type<
  typeof SaveReadingRequest
> {
  readonly _schemaModel?: never;
}

export const SaveReadingResponse = Schema.Struct({
  readingId: Schema.String,
}).annotate({ identifier: "SaveReadingResponse" });
export interface SaveReadingResponse extends Schema.Schema.Type<
  typeof SaveReadingResponse
> {
  readonly _schemaModel?: never;
}

export const ChangelogUpdateRequest = Schema.Struct({
  description: Schema.NonEmptyString,
}).annotate({ identifier: "ChangelogUpdateRequest" });
export interface ChangelogUpdateRequest extends Schema.Schema.Type<
  typeof ChangelogUpdateRequest
> {
  readonly _schemaModel?: never;
}

export const HealthVisibilityRequest = Schema.Struct({
  visible: Schema.Boolean,
}).annotate({ identifier: "HealthVisibilityRequest" });
export interface HealthVisibilityRequest extends Schema.Schema.Type<
  typeof HealthVisibilityRequest
> {
  readonly _schemaModel?: never;
}

export const VocabularyEntryRequest = VocabularyEntry.annotate({
  identifier: "VocabularyEntryRequest",
});
export interface VocabularyEntryRequest extends Schema.Schema.Type<
  typeof VocabularyEntryRequest
> {
  readonly _schemaModel?: never;
}

export const VocabularyUpdateRequest = Schema.Struct({
  label: VocabularyEntry.fields.label,
  unit: VocabularyEntry.fields.unit,
  referenceRange: VocabularyEntry.fields.referenceRange,
  description: VocabularyEntry.fields.description,
  featured: VocabularyEntry.fields.featured,
  visible: VocabularyEntry.fields.visible,
}).annotate({ identifier: "VocabularyUpdateRequest" });
export interface VocabularyUpdateRequest extends Schema.Schema.Type<
  typeof VocabularyUpdateRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementCreateRequest = Schema.Struct({
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
}).annotate({ identifier: "SupplementCreateRequest" });
export interface SupplementCreateRequest extends Schema.Schema.Type<
  typeof SupplementCreateRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementUpdateRequest = Schema.Struct({
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
}).annotate({ identifier: "SupplementUpdateRequest" });
export interface SupplementUpdateRequest extends Schema.Schema.Type<
  typeof SupplementUpdateRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementDeleteQuery = Schema.Struct({
  changelogDate: Schema.String,
}).annotate({ identifier: "SupplementDeleteQuery" });
export interface SupplementDeleteQuery extends Schema.Schema.Type<
  typeof SupplementDeleteQuery
> {
  readonly _schemaModel?: never;
}

export const LoginRequest = Schema.Struct({ password: Schema.String }).annotate(
  {
    identifier: "LoginRequest",
  },
);
export interface LoginRequest extends Schema.Schema.Type<typeof LoginRequest> {
  readonly _schemaModel?: never;
}

export const OkResponse = Schema.Struct({ ok: Schema.Boolean }).annotate({
  identifier: "OkResponse",
});
export interface OkResponse extends Schema.Schema.Type<typeof OkResponse> {
  readonly _schemaModel?: never;
}

export const ReadingCursorQuery = Schema.Struct({
  date: Schema.optionalKey(Schema.String),
  id: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "ReadingCursorQuery" });
export interface ReadingCursorQuery extends Schema.Schema.Type<
  typeof ReadingCursorQuery
> {
  readonly _schemaModel?: never;
}

export const ChangelogCursorQuery = Schema.Struct({
  date: Schema.optionalKey(Schema.String),
  createdAt: Schema.optionalKey(Schema.String),
  id: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "ChangelogCursorQuery" });
export interface ChangelogCursorQuery extends Schema.Schema.Type<
  typeof ChangelogCursorQuery
> {
  readonly _schemaModel?: never;
}

export const AuthSession = Schema.Struct({
  token: Schema.String,
  secure: Schema.Boolean,
}).annotate({ identifier: "AuthSession" });
export interface AuthSession extends Schema.Schema.Type<typeof AuthSession> {
  readonly _schemaModel?: never;
}

export { ReferenceRange };
