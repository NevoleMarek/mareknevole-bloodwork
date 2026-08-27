export type {
  BiomarkerTrendPoint,
  BloodworkReading,
  ChangelogCursor,
  ChangelogPage,
  DashboardSnapshot,
  InterpretationProvenance,
  InterpretationReviewStatus,
  InterpretationSource,
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

import type {
  InterpretationReviewStatus,
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
} from "@/lib/effect/api";

/** Service inputs add the resource identity supplied by the URL path. */
export type SupplementCreateInput = SupplementCreateRequest;
export type SupplementUpdateInput = SupplementUpdateRequest & {
  readonly id: string;
};
export type SupplementDeleteInput = SupplementDeleteQuery & {
  readonly id: string;
};

/** Vocabulary updates carry review intent separately from the persisted value. */
export type VocabularyUpdateInput = VocabularyEntry & {
  readonly interpretationReviewStatus?: InterpretationReviewStatus;
};
