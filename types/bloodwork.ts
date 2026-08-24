export type {
  BiomarkerTrendPoint,
  BloodworkReading,
  ChangelogCursor,
  ChangelogPage,
  DashboardSnapshot,
  LabOverview,
  LatestPanel,
  Measurement,
  ReadingCursor,
  ReadingPage,
  ReadingWithMeasurements,
  ReadingSummary,
  ReferenceRange,
  Status,
  Supplement,
  SupplementChangelog,
  VocabularyEntry,
} from "@/lib/schemas/domain";

export type {
  ExportData,
  HealthImportConfig,
  HealthImportSummary,
  SupplementsResponse,
  VocabularyResponse as Vocabulary,
} from "@/lib/effect/api";

import type {
  SupplementCreateRequest,
  SupplementDeleteQuery,
  SupplementUpdateRequest,
} from "@/lib/effect/api";

/** Service inputs add the resource identity supplied by the URL path. */
export type SupplementCreateInput = SupplementCreateRequest;
export type SupplementUpdateInput = SupplementUpdateRequest & {
  readonly id: string;
};
export type SupplementDeleteInput = SupplementDeleteQuery & {
  readonly id: string;
};
