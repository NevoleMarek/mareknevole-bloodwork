export type {
  BiomarkerTrendPoint,
  BloodworkReading,
  ChangelogCursor,
  ChangelogPage,
  DashboardSnapshot,
  LabOverview,
  Measurement,
  ReadingCursor,
  ReadingPage,
  ReadingWithMeasurements,
  ReadingSummary,
  Status,
  Supplement,
  SupplementChangelog,
  VocabularyEntry,
} from "@/lib/schemas/domain";

export type {
  HealthImportConfig,
  VocabularyResponse as Vocabulary,
} from "@/lib/effect/api";

import type {
  SupplementCreateRequest,
  SupplementDeleteQuery,
  SupplementUpdateRequest,
  VocabularyDeleteQuery,
  VocabularyUpdateRequest,
} from "@/lib/effect/api";

/** Service inputs add the resource identity supplied by the URL path. */
export type SupplementCreateInput = SupplementCreateRequest;
export type SupplementUpdateInput = SupplementUpdateRequest & {
  readonly id: string;
};
export type SupplementDeleteInput = SupplementDeleteQuery & {
  readonly id: string;
};

/** Service input adds the resource identity supplied by the URL path. */
export type VocabularyUpdateInput = VocabularyUpdateRequest & {
  readonly key: string;
};

/** Service input adds the resource identity supplied by the URL path. */
export type VocabularyDeleteInput = VocabularyDeleteQuery & {
  readonly key: string;
};
