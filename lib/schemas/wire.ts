import * as Schema from "effect/Schema";

import {
  BloodworkReading,
  BiomarkerTrendPoint,
  ChangelogPage,
  ExtractedVariable,
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
  SupplementChangelog,
  VocabularyEntry,
} from "@/lib/schemas/domain";

export const VocabularyResponse = Schema.Struct({
  entries: Schema.mutable(Schema.Array(VocabularyEntry)),
});
export interface VocabularyResponse extends Schema.Schema.Type<
  typeof VocabularyResponse
> {
  readonly _schemaModel?: never;
}

export const ReadingPageResponse = ReadingPage;
export const ExportData = Schema.Struct({
  vocabulary: VocabularyResponse,
  readings: Schema.mutable(Schema.Array(BloodworkReading)),
});
export interface ExportData extends Schema.Schema.Type<typeof ExportData> {
  readonly _schemaModel?: never;
}

export const BiomarkerTrendResponse = Schema.Struct({
  points: Schema.mutable(Schema.Array(BiomarkerTrendPoint)),
});
export interface BiomarkerTrendResponse extends Schema.Schema.Type<
  typeof BiomarkerTrendResponse
> {
  readonly _schemaModel?: never;
}

export const ChangelogPageResponse = ChangelogPage;
export const SupplementsResponse = Schema.Struct({
  supplements: Schema.mutable(Schema.Array(Supplement)),
  changelog: Schema.mutable(Schema.Array(SupplementChangelog)),
});
export interface SupplementsResponse extends Schema.Schema.Type<
  typeof SupplementsResponse
> {
  readonly _schemaModel?: never;
}

export const HealthDataResponse = HealthData;
export const HealthMetricConfigs = Schema.mutable(
  Schema.Array(HealthMetricConfig),
);

export const HealthImportConfig = Schema.Struct({
  metric: Schema.String,
  label: Schema.String,
  unit: Schema.String,
  aggregation: Schema.String,
});
export interface HealthImportConfig extends Schema.Schema.Type<
  typeof HealthImportConfig
> {
  readonly _schemaModel?: never;
}

export const HealthImportRequest = Schema.Struct({
  metrics: Schema.mutable(Schema.Array(HealthMetric)),
  configs: Schema.mutable(Schema.Array(HealthImportConfig)),
});
export interface HealthImportRequest extends Schema.Schema.Type<
  typeof HealthImportRequest
> {
  readonly _schemaModel?: never;
}

export const HealthImportResponse = Schema.Struct({
  error: Schema.optional(Schema.String),
  metrics: Schema.optional(Schema.Number),
  days: Schema.optional(Schema.Number),
});
export interface HealthImportResponse extends Schema.Schema.Type<
  typeof HealthImportResponse
> {
  readonly _schemaModel?: never;
}

export const ExtractResponse = Schema.Struct({
  date: Schema.String,
  variables: Schema.mutable(Schema.Array(ExtractedVariable)),
});
export interface ExtractResponse extends Schema.Schema.Type<
  typeof ExtractResponse
> {
  readonly _schemaModel?: never;
}

export const MapRequest = Schema.Struct({
  variables: Schema.mutable(Schema.Array(ExtractedVariable)),
  vocabulary: Schema.mutable(Schema.Array(VocabularyEntry)),
});
export interface MapRequest extends Schema.Schema.Type<typeof MapRequest> {
  readonly _schemaModel?: never;
}

export const MapResponse = Schema.Struct({
  mappings: Schema.mutable(Schema.Array(MappedVariable)),
});
export interface MapResponse extends Schema.Schema.Type<typeof MapResponse> {
  readonly _schemaModel?: never;
}

export const ResearchRequest = Schema.Struct({
  newEntries: Schema.mutable(Schema.Array(ResearchEntry)),
});
export interface ResearchRequest extends Schema.Schema.Type<
  typeof ResearchRequest
> {
  readonly _schemaModel?: never;
}

export const ResearchResponse = Schema.Struct({
  entries: Schema.mutable(Schema.Array(ResearchedEntry)),
});
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
});
export interface SaveReadingRequest extends Schema.Schema.Type<
  typeof SaveReadingRequest
> {
  readonly _schemaModel?: never;
}

export const SaveReadingResponse = Schema.Struct({
  readingId: Schema.String,
});
export interface SaveReadingResponse extends Schema.Schema.Type<
  typeof SaveReadingResponse
> {
  readonly _schemaModel?: never;
}

export const IdRequest = Schema.Struct({ id: Schema.String });
export interface IdRequest extends Schema.Schema.Type<typeof IdRequest> {
  readonly _schemaModel?: never;
}

export const KeyRequest = Schema.Struct({ key: Schema.String });
export interface KeyRequest extends Schema.Schema.Type<typeof KeyRequest> {
  readonly _schemaModel?: never;
}

export const ChangelogUpdateRequest = Schema.Struct({
  id: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
});
export interface ChangelogUpdateRequest extends Schema.Schema.Type<
  typeof ChangelogUpdateRequest
> {
  readonly _schemaModel?: never;
}

export const HealthVisibilityRequest = Schema.Struct({
  metric: Schema.String,
  visible: Schema.Boolean,
});
export interface HealthVisibilityRequest extends Schema.Schema.Type<
  typeof HealthVisibilityRequest
> {
  readonly _schemaModel?: never;
}

export const VocabularyEntryRequest = Schema.Struct({
  entry: VocabularyEntry,
});
export interface VocabularyEntryRequest extends Schema.Schema.Type<
  typeof VocabularyEntryRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementCreateRequest = Schema.Struct({
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
});
export interface SupplementCreateRequest extends Schema.Schema.Type<
  typeof SupplementCreateRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementUpdateRequest = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  dose: Schema.String,
  frequency: Schema.String,
  startedAt: Schema.String,
  changelogDate: Schema.String,
});
export interface SupplementUpdateRequest extends Schema.Schema.Type<
  typeof SupplementUpdateRequest
> {
  readonly _schemaModel?: never;
}

export const SupplementDeleteRequest = Schema.Struct({
  id: Schema.String,
  changelogDate: Schema.String,
});
export interface SupplementDeleteRequest extends Schema.Schema.Type<
  typeof SupplementDeleteRequest
> {
  readonly _schemaModel?: never;
}

export const LoginRequest = Schema.Struct({ password: Schema.String });
export interface LoginRequest extends Schema.Schema.Type<typeof LoginRequest> {
  readonly _schemaModel?: never;
}

export { ReferenceRange };
