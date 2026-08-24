import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import type { Period, TrendPeriod } from "@/lib/period";
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  NotFoundError,
  PersistenceError,
  ProviderDecodeError,
  ProviderError,
  ProviderRejected,
  RequestDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { ApplicationConfig } from "@/lib/effect/config";
import { DataCache } from "@/lib/effect/cache";
import {
  FLASH_MODEL,
  Gemini,
  PRO_MODEL,
  requireNonEmpty,
} from "@/lib/effect/provider";
import { Repository } from "@/lib/effect/repository";
import {
  ExtractResponse,
  MapResponse,
  ResearchResponse,
  type ExtractResponse as ExtractResponseType,
  type AuthSession,
  type ExportData,
  type HealthImportSummary as HealthImportSummaryType,
  type MapResponse as MapResponseType,
  type ResearchResponse as ResearchResponseType,
} from "@/lib/schemas/wire";
import type {
  BiomarkerTrendPoint,
  ChangelogCursor,
  ChangelogPage,
  DashboardSnapshot,
  ReadingCursor,
  ReadingPage,
  Supplement,
  SupplementCreateInput,
  SupplementDeleteInput,
  SupplementUpdateInput,
  VocabularyEntry,
} from "@/types/bloodwork";
import type {
  HealthData,
  HealthImportRequest,
  HealthMetricConfig,
} from "@/types/health";
import type {
  MapRequest,
  ResearchRequest,
  SaveReadingRequest,
} from "@/types/wizard";
import { extractVariablesPrompt } from "@/prompts/extract-variables";
import { mapVariablesPrompt } from "@/prompts/map-variables";
import { researchVariablesPrompt } from "@/prompts/research-variables";

type PersistenceFailure = PersistenceError | NotFoundError | ConflictError;

export interface DashboardContract {
  readonly getDashboard: () => Effect.Effect<
    DashboardSnapshot,
    PersistenceError
  >;
  readonly getData: () => Effect.Effect<ExportData, PersistenceError>;
  readonly getTrend: (
    key: string,
    period: TrendPeriod,
  ) => Effect.Effect<BiomarkerTrendPoint[], PersistenceError>;
  readonly getVisibleKeys: () => Effect.Effect<string[], PersistenceError>;
  readonly getHealth: (
    period: Period,
  ) => Effect.Effect<HealthData, PersistenceError>;
  readonly getFirstChangelogPage: () => Effect.Effect<
    ChangelogPage,
    PersistenceError
  >;
  readonly getChangelogPage: (
    cursor: ChangelogCursor | null,
  ) => Effect.Effect<ChangelogPage, PersistenceError>;
  readonly getReadingPage: (
    cursor: ReadingCursor | null,
  ) => Effect.Effect<ReadingPage, PersistenceError>;
}

export class Dashboard extends Context.Service<Dashboard, DashboardContract>()(
  "Bloodwork/Dashboard",
) {}

export const dashboardLayer = Layer.effect(
  Dashboard,
  Effect.gen(function* () {
    const repository = yield* Repository;
    const cache = yield* DataCache;
    const getDashboard = Effect.fn("Dashboard.getDashboard")(function* () {
      return yield* cache.dashboard();
    });
    const getData = Effect.fn("Dashboard.getData")(function* () {
      const vocabulary = yield* repository.getVocabulary();
      const readings = yield* repository.getReadingsWithMeasurements();
      return {
        vocabulary: { entries: vocabulary },
        readings: readings.map((reading) => ({
          date: reading.date,
          source: reading.source,
          measurements: reading.measurements,
        })),
      };
    });
    const getTrend = Effect.fn("Dashboard.getTrend")(function* (
      key: string,
      period: TrendPeriod,
    ) {
      return yield* cache.biomarkerTrend(key, period);
    });
    const getVisibleKeys = Effect.fn("Dashboard.getVisibleKeys")(function* () {
      return yield* cache.visibleVocabularyKeys();
    });
    const getHealth = Effect.fn("Dashboard.getHealth")(function* (
      period: Period,
    ) {
      return yield* cache.health(period);
    });
    const getFirstChangelogPage = Effect.fn("Dashboard.getFirstChangelogPage")(
      function* () {
        return yield* cache.firstChangelogPage();
      },
    );
    const getChangelogPage = Effect.fn("Dashboard.getChangelogPage")(function* (
      cursor: ChangelogCursor | null,
    ) {
      return yield* repository.getSupplementChangelogPage(cursor);
    });
    const getReadingPage = Effect.fn("Dashboard.getReadingPage")(function* (
      cursor: ReadingCursor | null,
    ) {
      return yield* repository.getReadingPage(cursor);
    });
    return Dashboard.of({
      getDashboard,
      getData,
      getTrend,
      getVisibleKeys,
      getHealth,
      getFirstChangelogPage,
      getChangelogPage,
      getReadingPage,
    });
  }),
);

export interface BloodworkContract {
  readonly getVocabulary: () => Effect.Effect<
    VocabularyEntry[],
    PersistenceError
  >;
  readonly saveReading: (
    request: SaveReadingRequest,
  ) => Effect.Effect<string, PersistenceFailure | ValidationError>;
  readonly deleteReading: (
    id: string,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly createVocabulary: (
    entry: VocabularyEntry,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly updateVocabulary: (
    entry: VocabularyEntry,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly deleteVocabulary: (
    key: string,
  ) => Effect.Effect<void, PersistenceError>;
}

export class Bloodwork extends Context.Service<Bloodwork, BloodworkContract>()(
  "Bloodwork/Bloodwork",
) {}

export const bloodworkLayer = Layer.effect(
  Bloodwork,
  Effect.gen(function* () {
    const repository = yield* Repository;
    const cache = yield* DataCache;
    const invalidate = Effect.fn("Bloodwork.invalidateDashboard")(function* () {
      yield* cache.invalidateDashboard();
    });
    const saveReading = Effect.fn("Bloodwork.saveReading")(function* (
      request: SaveReadingRequest,
    ) {
      const id = yield* repository.saveReading(request);
      yield* invalidate();
      return id;
    });
    const deleteReading = Effect.fn("Bloodwork.deleteReading")(function* (
      id: string,
    ) {
      yield* repository.deleteReading(id);
      yield* invalidate();
    });
    const createVocabulary = Effect.fn("Bloodwork.createVocabulary")(function* (
      entry: VocabularyEntry,
    ) {
      yield* repository.createVocabulary(entry);
      yield* invalidate();
    });
    const updateVocabulary = Effect.fn("Bloodwork.updateVocabulary")(function* (
      entry: VocabularyEntry,
    ) {
      yield* repository.updateVocabulary(entry);
      yield* invalidate();
    });
    const deleteVocabulary = Effect.fn("Bloodwork.deleteVocabulary")(function* (
      key: string,
    ) {
      yield* repository.deleteVocabulary(key);
      yield* invalidate();
    });
    return Bloodwork.of({
      getVocabulary: repository.getVocabulary,
      saveReading,
      deleteReading,
      createVocabulary,
      updateVocabulary,
      deleteVocabulary,
    });
  }),
);

export interface HealthContract {
  readonly getConfigs: () => Effect.Effect<
    HealthMetricConfig[],
    PersistenceError
  >;
  readonly updateVisibility: (request: {
    readonly metric: string;
    readonly visible: boolean;
  }) => Effect.Effect<void, PersistenceError>;
  readonly import: (
    request: HealthImportRequest,
  ) => Effect.Effect<HealthImportSummaryType, PersistenceError>;
}

export class Health extends Context.Service<Health, HealthContract>()(
  "Bloodwork/Health",
) {}

export const healthLayer = Layer.effect(
  Health,
  Effect.gen(function* () {
    const repository = yield* Repository;
    const cache = yield* DataCache;
    const getConfigs = Effect.fn("Health.getConfigs")(function* () {
      return yield* repository.getHealthMetricConfigs();
    });
    const updateVisibility = Effect.fn("Health.updateVisibility")(
      function* (request: {
        readonly metric: string;
        readonly visible: boolean;
      }) {
        yield* repository.updateHealthVisibility(
          request.metric,
          request.visible,
        );
        yield* cache.invalidateHealth();
      },
    );
    const importHealth = Effect.fn("Health.import")(function* (
      request: HealthImportRequest,
    ) {
      yield* repository.importHealth(request.metrics, request.configs);
      yield* cache.invalidateHealth();
      return {
        saved: request.metrics.length,
        metrics: request.configs.length,
        days: new Set(request.metrics.map((metric) => metric.date)).size,
      };
    });
    return Health.of({ getConfigs, updateVisibility, import: importHealth });
  }),
);

export interface SupplementsContract {
  readonly get: () => Effect.Effect<Supplement[], PersistenceError>;
  readonly create: (
    input: SupplementCreateInput,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly update: (
    input: SupplementUpdateInput,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly remove: (
    input: SupplementDeleteInput,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly updateChangelog: (
    id: string,
    description: string,
  ) => Effect.Effect<void, PersistenceFailure>;
  readonly deleteChangelog: (
    id: string,
  ) => Effect.Effect<void, PersistenceError>;
}

export class Supplements extends Context.Service<
  Supplements,
  SupplementsContract
>()("Bloodwork/Supplements") {}

export const supplementsLayer = Layer.effect(
  Supplements,
  Effect.gen(function* () {
    const repository = yield* Repository;
    const cache = yield* DataCache;
    const invalidate = Effect.fn("Supplements.invalidateDashboard")(
      function* () {
        yield* cache.invalidateDashboard();
      },
    );
    const get = Effect.fn("Supplements.get")(function* () {
      const supplements = yield* repository.getActiveSupplements();
      return supplements;
    });
    const create = Effect.fn("Supplements.create")(function* (
      input: SupplementCreateInput,
    ) {
      yield* repository.createSupplement(input);
      yield* invalidate();
    });
    const update = Effect.fn("Supplements.update")(function* (
      input: SupplementUpdateInput,
    ) {
      yield* repository.updateSupplement(input);
      yield* invalidate();
    });
    const remove = Effect.fn("Supplements.remove")(function* (
      input: SupplementDeleteInput,
    ) {
      yield* repository.deleteSupplement(input);
      yield* invalidate();
    });
    const updateChangelog = Effect.fn("Supplements.updateChangelog")(function* (
      id: string,
      description: string,
    ) {
      yield* repository.updateChangelog(id, description);
      yield* invalidate();
    });
    const deleteChangelog = Effect.fn("Supplements.deleteChangelog")(function* (
      id: string,
    ) {
      yield* repository.deleteChangelog(id);
      yield* invalidate();
    });
    return Supplements.of({
      get,
      create,
      update,
      remove,
      updateChangelog,
      deleteChangelog,
    });
  }),
);

export interface AuthContract {
  readonly authenticate: (
    password: string,
  ) => Effect.Effect<AuthSession, ConfigurationError | AuthenticationError>;
  readonly validate: (
    token: string,
  ) => Effect.Effect<void, ConfigurationError | AuthenticationError>;
}

export class Auth extends Context.Service<Auth, AuthContract>()(
  "Bloodwork/Auth",
) {}

export const authLayer = Layer.effect(
  Auth,
  Effect.gen(function* () {
    const config = yield* ApplicationConfig;
    const encodeHex = (bytes: Uint8Array): string =>
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const sessionSignature = (secret: string, payload: string) =>
      Effect.tryPromise({
        try: async () => {
          const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
          );
          const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(payload),
          );
          return encodeHex(new Uint8Array(signature));
        },
        catch: (cause) =>
          new ConfigurationError({ key: `crypto:${String(cause)}` }),
      });
    const makeSessionToken = (secret: string) =>
      Effect.gen(function* () {
        const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        const payload = `${expiresAt}.${crypto.randomUUID()}`;
        const signature = yield* sessionSignature(secret, payload);
        return `${payload}.${signature}`;
      });
    const verifySessionToken = (token: string, secret: string) =>
      Effect.tryPromise({
        try: async () => {
          const parts = token.split(".");
          if (parts.length !== 3) return false;
          const expiresAt = Number(parts[0]);
          const nonce = parts[1];
          const signature = parts[2];
          if (
            !Number.isSafeInteger(expiresAt) ||
            expiresAt <= Math.floor(Date.now() / 1000) ||
            nonce.length === 0 ||
            !/^[0-9a-f]{64}$/.test(signature)
          ) {
            return false;
          }
          const bytes = new Uint8Array(signature.length / 2);
          for (let index = 0; index < bytes.length; index++) {
            bytes[index] = Number.parseInt(
              signature.slice(index * 2, index * 2 + 2),
              16,
            );
          }
          const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"],
          );
          return crypto.subtle.verify(
            "HMAC",
            key,
            bytes,
            new TextEncoder().encode(`${parts[0]}.${nonce}`),
          );
        },
        catch: (cause) =>
          new ConfigurationError({ key: `crypto:${String(cause)}` }),
      });
    const authenticate = Effect.fn("Auth.authenticate")(function* (
      password: string,
    ) {
      const expected = Redacted.value(yield* config.requireAdminPassword());
      const encoder = new TextEncoder();
      const [hashA, hashB] = yield* Effect.all(
        [
          Effect.tryPromise({
            try: () =>
              crypto.subtle.digest("SHA-256", encoder.encode(password)),
            catch: (cause) =>
              new ConfigurationError({ key: `crypto:${String(cause)}` }),
          }),
          Effect.tryPromise({
            try: () =>
              crypto.subtle.digest("SHA-256", encoder.encode(expected)),
            catch: (cause) =>
              new ConfigurationError({ key: `crypto:${String(cause)}` }),
          }),
        ],
        { concurrency: "unbounded" },
      );
      const a = new Uint8Array(hashA);
      const b = new Uint8Array(hashB);
      let mismatch = 0;
      for (let index = 0; index < a.length; index++)
        mismatch |= a[index] ^ b[index];
      if (mismatch !== 0) {
        return yield* Effect.fail(
          new AuthenticationError({ reason: "invalid-password" }),
        );
      }
      return {
        token: yield* makeSessionToken(expected),
        secure: config.nodeEnvironment !== "development",
      };
    });
    const validate = Effect.fn("Auth.validate")(function* (token: string) {
      const expected = Redacted.value(yield* config.requireAdminPassword());
      const valid = yield* verifySessionToken(token, expected);
      if (!valid) {
        return yield* Effect.fail(
          new AuthenticationError({ reason: "invalid-session" }),
        );
      }
    });
    return Auth.of({ authenticate, validate });
  }),
);

export interface ProviderWorkflowsContract {
  readonly extract: (
    file: File,
  ) => Effect.Effect<
    ExtractResponseType,
    | RequestDecodeError
    | ProviderError
    | ProviderRejected
    | ProviderDecodeError
    | ValidationError
    | ConfigurationError
  >;
  readonly map: (
    request: MapRequest,
  ) => Effect.Effect<
    MapResponseType,
    | ProviderError
    | ProviderRejected
    | ProviderDecodeError
    | ValidationError
    | ConfigurationError
  >;
  readonly research: (
    request: ResearchRequest,
  ) => Effect.Effect<
    ResearchResponseType,
    | ProviderError
    | ProviderRejected
    | ProviderDecodeError
    | ValidationError
    | ConfigurationError
  >;
}

export class ProviderWorkflows extends Context.Service<
  ProviderWorkflows,
  ProviderWorkflowsContract
>()("Bloodwork/ProviderWorkflows") {}

export const providerWorkflowsLayer = Layer.effect(
  ProviderWorkflows,
  Effect.gen(function* () {
    const gemini = yield* Gemini;
    const extract = Effect.fn("ProviderWorkflows.extract")(function* (
      file: File,
    ) {
      const bytes = yield* Effect.tryPromise({
        try: () => file.arrayBuffer(),
        catch: () =>
          new RequestDecodeError({
            operation: "extract.file",
            message: "Invalid PDF",
          }),
      });
      const base64 = Buffer.from(bytes).toString("base64");
      const text = yield* gemini.generate(
        FLASH_MODEL,
        extractVariablesPrompt,
        base64,
      );
      const result = yield* gemini.decodeJson(
        ExtractResponse,
        text,
        "extract.response",
      );
      yield* requireNonEmpty(result.variables, "extract.variables");
      if (result.date.length === 0) {
        return yield* Effect.fail(
          new ValidationError({
            operation: "extract.date",
            message: "No date extracted",
          }),
        );
      }
      return result;
    });
    const map = Effect.fn("ProviderWorkflows.map")(function* (
      request: MapRequest,
    ) {
      yield* requireNonEmpty(request.variables, "map.variables");
      const prompt = mapVariablesPrompt(
        JSON.stringify(request.vocabulary, null, 2),
        JSON.stringify(request.variables, null, 2),
      );
      const text = yield* gemini.generate(FLASH_MODEL, prompt);
      const result = yield* gemini.decodeJson(
        MapResponse,
        text,
        "map.response",
      );
      yield* requireNonEmpty(result.mappings, "map.mappings");
      return result;
    });
    const research = Effect.fn("ProviderWorkflows.research")(function* (
      request: ResearchRequest,
    ) {
      yield* requireNonEmpty(request.newEntries, "research.entries");
      const prompt = researchVariablesPrompt(
        JSON.stringify(request.newEntries, null, 2),
      );
      const text = yield* gemini.generate(PRO_MODEL, prompt);
      const result = yield* gemini.decodeJson(
        ResearchResponse,
        text,
        "research.response",
      );
      yield* requireNonEmpty(result.entries, "research.results");
      return result;
    });
    return ProviderWorkflows.of({ extract, map, research });
  }),
);
