import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

import {
  ApiBadGateway,
  ApiBadRequest,
  ApiConflict,
  ApiNotFound,
  ApiServiceUnavailable,
  ApiUnauthorized,
} from "@/lib/effect/api-errors";
import { PERIODS } from "@/lib/period";
import {
  BiomarkerTrendResponse,
  ChangelogCursorQuery,
  ChangelogPageResponse,
  ChangelogUpdateRequest,
  ExportData,
  ExtractResponse,
  HealthDataResponse,
  HealthImportRequest,
  HealthImportSummary,
  HealthMetricConfigs,
  HealthVisibilityRequest,
  IdRequest,
  KeyRequest,
  LoginRequest,
  MapRequest,
  MapResponse,
  OkResponse,
  ReadingCursorQuery,
  ReadingPageResponse,
  ResearchRequest,
  ResearchResponse,
  SaveReadingRequest,
  SaveReadingResponse,
  SupplementCreateRequest,
  SupplementDeleteRequest,
  SupplementsResponse,
  SupplementUpdateRequest,
  VocabularyEntryRequest,
  VocabularyResponse,
} from "@/lib/schemas/wire";

const Period = Schema.Literals(PERIODS).annotate({ identifier: "Period" });
const TrendParams = Schema.Struct({ key: Schema.String }).annotate({
  identifier: "TrendParams",
});
const HealthQuery = Schema.Struct({ period: Period }).annotate({
  identifier: "HealthQuery",
});
const ExtractForm = Schema.FormData.pipe(HttpApiSchema.asMultipart());
const unavailableErrors = [ApiServiceUnavailable] as const;
const badRequestUnavailableErrors = [
  ApiBadRequest,
  ApiServiceUnavailable,
] as const;
const persistenceMutationErrors = [
  ApiNotFound,
  ApiConflict,
  ApiServiceUnavailable,
] as const;
const saveReadingErrors = [
  ApiBadRequest,
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
const providerErrors = [
  ApiBadRequest,
  ApiBadGateway,
  ApiServiceUnavailable,
] as const;

const publicGroup = HttpApiGroup.make("public").add(
  HttpApiEndpoint.get("changelog", "/api/public/changelog", {
    query: ChangelogCursorQuery,
    success: ChangelogPageResponse,
    error: badRequestUnavailableErrors,
  }),
  HttpApiEndpoint.get("health", "/api/public/health", {
    query: HealthQuery,
    success: HealthDataResponse,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.get("trend", "/api/public/trends/:key", {
    params: TrendParams,
    success: BiomarkerTrendResponse,
    error: trendErrors,
  }),
);

const authGroup = HttpApiGroup.make("auth").add(
  HttpApiEndpoint.post("login", "/api/auth", {
    payload: LoginRequest,
    success: OkResponse,
    error: loginErrors,
  }),
  HttpApiEndpoint.delete("logout", "/api/auth", {
    success: OkResponse,
  }),
);

const dataGroup = HttpApiGroup.make("data").add(
  HttpApiEndpoint.get("exportData", "/api/data", {
    success: ExportData,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.get("readings", "/api/readings", {
    query: ReadingCursorQuery,
    success: ReadingPageResponse,
    error: badRequestUnavailableErrors,
  }),
  HttpApiEndpoint.post("saveReading", "/api/readings", {
    payload: SaveReadingRequest,
    success: SaveReadingResponse,
    error: saveReadingErrors,
  }),
  HttpApiEndpoint.delete("deleteReading", "/api/readings", {
    payload: IdRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.get("vocabulary", "/api/vocabulary", {
    success: VocabularyResponse,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.post("createVocabulary", "/api/vocabulary", {
    payload: VocabularyEntryRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.put("updateVocabulary", "/api/vocabulary", {
    payload: VocabularyEntryRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("deleteVocabulary", "/api/vocabulary", {
    payload: KeyRequest,
    success: OkResponse,
    error: unavailableErrors,
  }),
);

const supplementsGroup = HttpApiGroup.make("supplements").add(
  HttpApiEndpoint.get("list", "/api/supplements", {
    success: SupplementsResponse,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.post("create", "/api/supplements", {
    payload: SupplementCreateRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.put("update", "/api/supplements", {
    payload: SupplementUpdateRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("remove", "/api/supplements", {
    payload: SupplementDeleteRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.put("updateChangelog", "/api/changelog", {
    payload: ChangelogUpdateRequest,
    success: OkResponse,
    error: persistenceMutationErrors,
  }),
  HttpApiEndpoint.delete("deleteChangelog", "/api/changelog", {
    payload: IdRequest,
    success: OkResponse,
    error: unavailableErrors,
  }),
);

const healthGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("configs", "/api/health-config", {
    success: HealthMetricConfigs,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.patch("updateVisibility", "/api/health-config", {
    payload: HealthVisibilityRequest,
    success: OkResponse,
    error: unavailableErrors,
  }),
  HttpApiEndpoint.post("import", "/api/health-import", {
    payload: HealthImportRequest,
    success: HealthImportSummary,
    error: badRequestUnavailableErrors,
  }),
);

const providerGroup = HttpApiGroup.make("provider").add(
  HttpApiEndpoint.post("extract", "/api/extract", {
    payload: ExtractForm,
    success: ExtractResponse,
    error: providerErrors,
  }),
  HttpApiEndpoint.post("map", "/api/map", {
    payload: MapRequest,
    success: MapResponse,
    error: providerErrors,
  }),
  HttpApiEndpoint.post("research", "/api/research", {
    payload: ResearchRequest,
    success: ResearchResponse,
    error: providerErrors,
  }),
);

export const BloodworkApi = HttpApi.make("BloodworkApi").add(
  publicGroup,
  authGroup,
  dataGroup,
  supplementsGroup,
  healthGroup,
  providerGroup,
);
