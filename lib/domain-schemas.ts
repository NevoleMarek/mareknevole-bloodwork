// Compatibility barrel. New code should import from `lib/schemas/domain` or
// `lib/schemas/wire` according to whether the contract is domain or transport.
export * from "@/lib/schemas/domain";
export {
  BiomarkerTrendResponse as BiomarkerTrendResponseSchema,
  ChangelogPageResponse as ChangelogPageSchema,
  ChangelogUpdateRequest as ChangelogUpdateRequestSchema,
  ExportData as ExportDataSchema,
  ExtractResponse as ExtractResponseSchema,
  HealthDataResponse as HealthDataSchema,
  HealthImportRequest as HealthImportRequestSchema,
  HealthImportResponse as HealthImportResponseSchema,
  HealthMetricConfigs as HealthMetricConfigsSchema,
  HealthVisibilityRequest as HealthVisibilityRequestSchema,
  IdRequest as IdRequestSchema,
  KeyRequest as KeyRequestSchema,
  LoginRequest as LoginRequestSchema,
  MapRequest as MapRequestSchema,
  MapResponse as MapResponseSchema,
  ResearchRequest as ResearchRequestSchema,
  ResearchResponse as ResearchResponseSchema,
  SaveReadingRequest as SaveReadingRequestSchema,
  SupplementsResponse as SupplementsResponseSchema,
  SupplementCreateRequest as SupplementCreateRequestSchema,
  SupplementDeleteRequest as SupplementDeleteRequestSchema,
  SupplementUpdateRequest as SupplementUpdateRequestSchema,
  VocabularyEntryRequest as VocabularyEntryRequestSchema,
  VocabularyResponse as VocabularyResponseSchema,
  ReadingPageResponse as ReadingPageSchema,
} from "@/lib/schemas/wire";
export {
  HealthMetricConfig as HealthMetricConfigSchema,
  VocabularyEntry as VocabularyEntrySchema,
} from "@/lib/schemas/domain";
