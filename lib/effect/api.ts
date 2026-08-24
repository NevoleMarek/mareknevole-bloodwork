import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import { PERIODS } from "@/lib/period";
import {
  BiomarkerTrendResponse,
  ChangelogCursorQuery,
  ChangelogPageResponse,
  ChangelogUpdateRequest,
  ExportData,
  ExtractResponse,
  HealthImportConfig,
  HealthDataResponse,
  HealthImportRequest,
  HealthImportSummary,
  HealthMetricConfigs,
  HealthVisibilityRequest,
  LoginRequest,
  MapRequest,
  MapResponse,
  ReadingCursorQuery,
  ReadingPageResponse,
  ResearchRequest,
  ResearchResponse,
  SaveReadingRequest,
  SaveReadingResponse,
  SupplementCreateRequest,
  SupplementDeleteQuery,
  SupplementUpdateRequest,
  SupplementsResponse,
  VocabularyEntryRequest,
  VocabularyUpdateRequest,
  VocabularyResponse,
} from "@/lib/schemas/wire";

/**
 * Transport errors are deliberately declared beside the API they describe.
 * This module is the only module imported by both the browser and the server;
 * it does not import services, persistence, configuration, or runtime code.
 */
export class ApiBadRequest extends Schema.TaggedErrorClass<ApiBadRequest>()(
  "Bloodwork.ApiBadRequest",
  { error: Schema.String },
  { httpApiStatus: 400 },
) {}

export class ApiUnauthorized extends Schema.TaggedErrorClass<ApiUnauthorized>()(
  "Bloodwork.ApiUnauthorized",
  { error: Schema.String },
  { httpApiStatus: 401 },
) {}

export class ApiNotFound extends Schema.TaggedErrorClass<ApiNotFound>()(
  "Bloodwork.ApiNotFound",
  { error: Schema.String },
  { httpApiStatus: 404 },
) {}

export class ApiConflict extends Schema.TaggedErrorClass<ApiConflict>()(
  "Bloodwork.ApiConflict",
  { error: Schema.String },
  { httpApiStatus: 409 },
) {}

export class ApiBadGateway extends Schema.TaggedErrorClass<ApiBadGateway>()(
  "Bloodwork.ApiBadGateway",
  { error: Schema.String },
  { httpApiStatus: 502 },
) {}

export class ApiServiceUnavailable extends Schema.TaggedErrorClass<ApiServiceUnavailable>()(
  "Bloodwork.ApiServiceUnavailable",
  { error: Schema.String },
  { httpApiStatus: 503 },
) {}

export type ApiError =
  | ApiBadRequest
  | ApiUnauthorized
  | ApiNotFound
  | ApiConflict
  | ApiBadGateway
  | ApiServiceUnavailable;

/** IDs in URL parameters are constrained and nominal to prevent mix-ups. */
export const ReadingId = Schema.NonEmptyString.pipe(
  Schema.brand("ReadingId"),
).annotate({ identifier: "ReadingId" });
export type ReadingId = typeof ReadingId.Type;
export const makeReadingId = (value: string): ReadingId =>
  Schema.decodeSync(ReadingId)(value);

export const VocabularyKey = Schema.NonEmptyString.pipe(
  Schema.brand("VocabularyKey"),
).annotate({ identifier: "VocabularyKey" });
export type VocabularyKey = typeof VocabularyKey.Type;
export const makeVocabularyKey = (value: string): VocabularyKey =>
  Schema.decodeSync(VocabularyKey)(value);

export const SupplementId = Schema.NonEmptyString.pipe(
  Schema.brand("SupplementId"),
).annotate({ identifier: "SupplementId" });
export type SupplementId = typeof SupplementId.Type;
export const makeSupplementId = (value: string): SupplementId =>
  Schema.decodeSync(SupplementId)(value);

export const ChangelogId = Schema.NonEmptyString.pipe(
  Schema.brand("ChangelogId"),
).annotate({ identifier: "ChangelogId" });
export type ChangelogId = typeof ChangelogId.Type;
export const makeChangelogId = (value: string): ChangelogId =>
  Schema.decodeSync(ChangelogId)(value);

export const BiomarkerKey = Schema.NonEmptyString.pipe(
  Schema.brand("BiomarkerKey"),
).annotate({ identifier: "BiomarkerKey" });
export type BiomarkerKey = typeof BiomarkerKey.Type;
export const makeBiomarkerKey = (value: string): BiomarkerKey =>
  Schema.decodeSync(BiomarkerKey)(value);

const Period = Schema.Literals(PERIODS).annotate({ identifier: "Period" });
const TrendParams = Schema.Struct({ key: BiomarkerKey }).annotate({
  identifier: "TrendParams",
});
const ReadingParams = Schema.Struct({ id: ReadingId }).annotate({
  identifier: "ReadingParams",
});
const VocabularyParams = Schema.Struct({ key: VocabularyKey }).annotate({
  identifier: "VocabularyParams",
});
const SupplementParams = Schema.Struct({ id: SupplementId }).annotate({
  identifier: "SupplementParams",
});
const ChangelogParams = Schema.Struct({ id: ChangelogId }).annotate({
  identifier: "ChangelogParams",
});
const HealthMetricParams = Schema.Struct({
  metric: Schema.NonEmptyString,
}).annotate({
  identifier: "HealthMetricParams",
});
const HealthQuery = Schema.Struct({ period: Period }).annotate({
  identifier: "HealthQuery",
});
const ExtractForm = Schema.FormData.pipe(HttpApiSchema.asMultipart());

const unavailableErrors = [ApiServiceUnavailable] as const;
const protectedUnavailableErrors = [
  ApiUnauthorized,
  ApiServiceUnavailable,
] as const;
const badRequestUnavailableErrors = [
  ApiBadRequest,
  ApiServiceUnavailable,
] as const;
const protectedBadRequestUnavailableErrors = [
  ApiBadRequest,
  ApiUnauthorized,
  ApiServiceUnavailable,
] as const;
const protectedPersistenceMutationErrors = [
  ApiUnauthorized,
  ApiNotFound,
  ApiConflict,
  ApiServiceUnavailable,
] as const;
const protectedSaveReadingErrors = [
  ApiBadRequest,
  ApiUnauthorized,
  ApiNotFound,
  ApiConflict,
  ApiServiceUnavailable,
] as const;
const trendErrors = [
  ApiBadRequest,
  ApiNotFound,
  ApiServiceUnavailable,
] as const;
const loginErrors = [ApiUnauthorized, ApiServiceUnavailable] as const;
const protectedProviderErrors = [
  ApiBadRequest,
  ApiUnauthorized,
  ApiBadGateway,
  ApiServiceUnavailable,
] as const;

/** Dashboard reads are grouped by user goal, not by their storage adapter. */
const dashboardGroup = HttpApiGroup.make("dashboard").add(
  HttpApiEndpoint.get("health", "/api/dashboard/health", {
    query: HealthQuery,
    success: HealthDataResponse,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.get("trend", "/api/biomarkers/:key/trend", {
    params: TrendParams,
    success: BiomarkerTrendResponse,
    error: trendErrors,
  }),
);

const changelogGroup = HttpApiGroup.make("changelog").add(
  HttpApiEndpoint.get("list", "/api/changelog", {
    query: ChangelogCursorQuery,
    success: ChangelogPageResponse,
    error: badRequestUnavailableErrors,
  }),
  HttpApiEndpoint.put("update", "/api/changelog/:id", {
    params: ChangelogParams,
    payload: ChangelogUpdateRequest,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("delete", "/api/changelog/:id", {
    params: ChangelogParams,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
);

const sessionGroup = HttpApiGroup.make("session").add(
  HttpApiEndpoint.post("create", "/api/session", {
    payload: LoginRequest,
    success: Schema.Struct({ authenticated: Schema.Literal(true) }).annotate({
      identifier: "SessionCreated",
    }),
    error: loginErrors,
  }),
  HttpApiEndpoint.delete("delete", "/api/session", {
    success: HttpApiSchema.NoContent,
  }),
);

const readingsGroup = HttpApiGroup.make("readings").add(
  HttpApiEndpoint.get("list", "/api/readings", {
    query: ReadingCursorQuery,
    success: ReadingPageResponse,
    error: protectedBadRequestUnavailableErrors,
  }),
  /** Export is a separate, explicit expensive operation. */
  HttpApiEndpoint.get("export", "/api/readings/export", {
    success: ExportData,
    error: protectedUnavailableErrors,
  }),
  HttpApiEndpoint.post("create", "/api/readings", {
    payload: SaveReadingRequest,
    success: SaveReadingResponse,
    error: protectedSaveReadingErrors,
  }),
  HttpApiEndpoint.delete("delete", "/api/readings/:id", {
    params: ReadingParams,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
);

const vocabularyGroup = HttpApiGroup.make("vocabulary").add(
  HttpApiEndpoint.get("list", "/api/vocabulary", {
    success: VocabularyResponse,
    error: protectedUnavailableErrors,
  }),
  HttpApiEndpoint.post("create", "/api/vocabulary", {
    payload: VocabularyEntryRequest,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
  HttpApiEndpoint.put("update", "/api/vocabulary/:key", {
    params: VocabularyParams,
    payload: VocabularyUpdateRequest,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("delete", "/api/vocabulary/:key", {
    params: VocabularyParams,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
);

const supplementsGroup = HttpApiGroup.make("supplements").add(
  HttpApiEndpoint.get("list", "/api/supplements", {
    success: SupplementsResponse,
    error: protectedUnavailableErrors,
  }),
  HttpApiEndpoint.post("create", "/api/supplements", {
    payload: SupplementCreateRequest,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
  HttpApiEndpoint.put("update", "/api/supplements/:id", {
    params: SupplementParams,
    payload: SupplementUpdateRequest,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("delete", "/api/supplements/:id", {
    params: SupplementParams,
    query: SupplementDeleteQuery,
    success: HttpApiSchema.NoContent,
    error: protectedPersistenceMutationErrors,
  }),
);

const healthGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("configs", "/api/health/metrics", {
    success: HealthMetricConfigs,
    error: protectedUnavailableErrors,
  }),
  HttpApiEndpoint.patch("updateVisibility", "/api/health/metrics/:metric", {
    params: HealthMetricParams,
    payload: HealthVisibilityRequest,
    success: HttpApiSchema.NoContent,
    error: protectedUnavailableErrors,
  }),
  HttpApiEndpoint.post("import", "/api/health/import", {
    payload: HealthImportRequest,
    success: HealthImportSummary,
    error: protectedBadRequestUnavailableErrors,
  }),
);

const importGroup = HttpApiGroup.make("import").add(
  HttpApiEndpoint.post("extract", "/api/import/extract", {
    payload: ExtractForm,
    success: ExtractResponse,
    error: protectedProviderErrors,
  }),
  HttpApiEndpoint.post("map", "/api/import/map", {
    payload: MapRequest,
    success: MapResponse,
    error: protectedProviderErrors,
  }),
  HttpApiEndpoint.post("research", "/api/import/research", {
    payload: ResearchRequest,
    success: ResearchResponse,
    error: protectedProviderErrors,
  }),
);

export const BloodworkApi = HttpApi.make("BloodworkApi").add(
  dashboardGroup,
  changelogGroup,
  sessionGroup,
  readingsGroup,
  vocabularyGroup,
  supplementsGroup,
  healthGroup,
  importGroup,
);

export const apiErrorMessage = (cause: unknown): string | undefined => {
  if (
    cause instanceof ApiBadRequest ||
    cause instanceof ApiUnauthorized ||
    cause instanceof ApiNotFound ||
    cause instanceof ApiConflict ||
    cause instanceof ApiBadGateway ||
    cause instanceof ApiServiceUnavailable
  ) {
    return cause.error;
  }
  return undefined;
};

// Wire schemas are re-exported from the contract so browser consumers do not
// need a second import surface for request/response models.
export {
  BiomarkerTrendResponse,
  ChangelogCursorQuery,
  ChangelogPageResponse,
  ChangelogUpdateRequest,
  ExportData,
  ExtractResponse,
  HealthImportConfig,
  HealthDataResponse,
  HealthImportRequest,
  HealthImportSummary,
  HealthMetricConfigs,
  HealthVisibilityRequest,
  LoginRequest,
  MapRequest,
  MapResponse,
  ReadingCursorQuery,
  ReadingPageResponse,
  ResearchRequest,
  ResearchResponse,
  SaveReadingRequest,
  SaveReadingResponse,
  SupplementCreateRequest,
  SupplementDeleteQuery,
  SupplementUpdateRequest,
  SupplementsResponse,
  VocabularyEntryRequest,
  VocabularyUpdateRequest,
  VocabularyResponse,
};

export type BloodworkApiClient =
  import("effect/unstable/httpapi").HttpApiClient.ForApi<typeof BloodworkApi>;
