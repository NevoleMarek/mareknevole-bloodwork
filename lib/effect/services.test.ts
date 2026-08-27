import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { ApplicationConfig } from "@/lib/effect/config";
import { DataCache } from "@/lib/effect/cache";
import {
  AuthenticationError,
  ConfigurationError,
  ProviderDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { Gemini } from "@/lib/effect/provider";
import { Repository } from "@/lib/effect/repository";
import {
  authLayer,
  bloodworkLayer,
  Bloodwork,
  providerWorkflowsLayer,
  Auth,
  ProviderWorkflows,
  supplementsLayer,
  Supplements,
} from "@/lib/effect/services";
import type { SaveReadingRequest } from "@/types/wizard";

const unused = () => Effect.die("unused service operation");

const emptyReading: SaveReadingRequest = {
  date: "2026-01-01",
  source: "lab",
  measurements: [],
  newVocabulary: [],
};

const repository = (
  saveReading: Repository["Service"]["saveReading"],
  getActiveSupplements: Repository["Service"]["getActiveSupplements"] = unused,
  getSupplementChangelogPage: Repository["Service"]["getSupplementChangelogPage"] = unused,
) =>
  Repository.of({
    getVocabulary: unused,
    getLabOverview: unused,
    getBiomarkerTrend: unused,
    getReadingsWithMeasurements: unused,
    getReadingPage: unused,
    getActiveSupplements,
    getSupplementChangelogPage,
    getVisibleHealthMetrics: unused,
    getHealthMetricConfigs: unused,
    getVisibleVocabularyKeys: unused,
    updateChangelog: unused,
    deleteChangelog: unused,
    updateHealthVisibility: unused,
    importHealth: unused,
    deleteReading: unused,
    saveReading,
    createVocabulary: unused,
    updateVocabulary: unused,
    deleteVocabulary: unused,
    createSupplement: unused,
    updateSupplement: unused,
    deleteSupplement: unused,
  });

const cache = (
  invalidateDashboard: DataCache["Service"]["invalidateDashboard"],
) =>
  DataCache.of({
    dashboard: unused,
    firstChangelogPage: unused,
    biomarkerTrend: unused,
    visibleVocabularyKeys: unused,
    health: unused,
    invalidateDashboard,
    invalidateHealth: unused,
  });

describe("Effect application services", () => {
  it("keeps an absent extracted specimen date unknown", async () => {
    const gemini = Layer.succeed(
      Gemini,
      Gemini.of({
        generate: () => Effect.succeed("provider response"),
        decodeJson: <S extends Schema.Top>() =>
          Effect.succeed(
            // SAFETY: The test double returns the exact decoded response shape
            // expected by the schema supplied to this generic method.
            {
              date: null,
              variables: [{ label: "Glucose", value: 5.1, unit: "mmol/L" }],
            } as S["Type"],
          ),
      }),
    );
    const workflows = providerWorkflowsLayer.pipe(Layer.provide(gemini));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* ProviderWorkflows;
        return yield* service.extract(
          new File(["pdf"], "panel.pdf", { type: "application/pdf" }),
        );
      }).pipe(Effect.provide(workflows)),
    );

    expect(result.date).toBeNull();
  });

  it("does not load changelog rows when listing supplements", async () => {
    let changelogReads = 0;
    const layer = supplementsLayer.pipe(
      Layer.provide(
        Layer.merge(
          Layer.succeed(
            Repository,
            repository(
              unused,
              () => Effect.succeed([]),
              () => {
                changelogReads += 1;
                return Effect.die("supplement list must not read changelog");
              },
            ),
          ),
          Layer.succeed(DataCache, cache(unused)),
        ),
      ),
    );
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Supplements;
        return yield* service.get();
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual([]);
    expect(changelogReads).toBe(0);
  });

  it("keeps missing admin configuration in the typed error channel", async () => {
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: undefined,
        geminiApiKey: undefined,
        nodeEnvironment: "test",
        requireAdminPassword: () =>
          Effect.fail(new ConfigurationError({ key: "ADMIN_PASSWORD" })),
        requireGeminiApiKey: () =>
          Effect.fail(new ConfigurationError({ key: "GEMINI_API_KEY" })),
      }),
    );
    const auth = authLayer.pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Auth;
      return yield* service.authenticate("secret");
    }).pipe(Effect.provide(auth));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      ConfigurationError,
    );
  });

  it("keeps authentication failures in the typed error channel", async () => {
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: Redacted.make("secret"),
        geminiApiKey: undefined,
        nodeEnvironment: "test",
        requireAdminPassword: () => Effect.succeed(Redacted.make("secret")),
        requireGeminiApiKey: () =>
          Effect.fail(new ConfigurationError({ key: "GEMINI_API_KEY" })),
      }),
    );
    const auth = authLayer.pipe(Layer.provide(config));
    const program = Effect.gen(function* () {
      const service = yield* Auth;
      return yield* service.authenticate("wrong");
    }).pipe(Effect.provide(auth));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("validates signed session tokens without trusting cookie presence", async () => {
    const config = Layer.succeed(
      ApplicationConfig,
      ApplicationConfig.of({
        adminPassword: Redacted.make("secret"),
        geminiApiKey: undefined,
        nodeEnvironment: "test",
        requireAdminPassword: () => Effect.succeed(Redacted.make("secret")),
        requireGeminiApiKey: () =>
          Effect.fail(new ConfigurationError({ key: "GEMINI_API_KEY" })),
      }),
    );
    const auth = authLayer.pipe(Layer.provide(config));
    const token = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Auth;
        const session = yield* service.authenticate("secret");
        yield* service.validate(session.token);
        return session.token;
      }).pipe(Effect.provide(auth)),
    );

    await expect(
      Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* Auth;
          return yield* service.validate(`${token}-tampered`);
        }).pipe(Effect.provide(auth)),
      ),
    ).rejects.toMatchObject({ reason: "invalid-session" });
  });

  it("classifies a provider response decode failure", async () => {
    const gemini = Layer.succeed(
      Gemini,
      Gemini.of({
        generate: () => Effect.succeed("not-json"),
        decodeJson: <S extends Schema.Top>(
          _schema: S,
          _text: string,
          operation: string,
        ) =>
          Effect.fail(
            new ProviderDecodeError({ operation, cause: "malformed" }),
          ),
      }),
    );
    const workflows = providerWorkflowsLayer.pipe(Layer.provide(gemini));
    const program = Effect.gen(function* () {
      const service = yield* ProviderWorkflows;
      return yield* service.map({
        variables: [{ label: "Glucose", value: 90, unit: "mg/dL" }],
        vocabulary: [],
      });
    }).pipe(Effect.provide(workflows));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      ProviderDecodeError,
    );
  });

  it("runs the real Bloodwork service and invalidates the dashboard after a mutation", async () => {
    let invalidations = 0;
    const dependencies = Layer.mergeAll(
      Layer.succeed(
        Repository,
        repository(() => Effect.succeed("reading-1")),
      ),
      Layer.succeed(
        DataCache,
        cache(() => {
          invalidations += 1;
          return Effect.succeed(undefined);
        }),
      ),
    );
    const bloodwork = bloodworkLayer.pipe(Layer.provide(dependencies));
    const program = Effect.gen(function* () {
      const service = yield* Bloodwork;
      return yield* service.saveReading(emptyReading);
    }).pipe(Effect.provide(bloodwork));

    await expect(Effect.runPromise(program)).resolves.toBe("reading-1");
    expect(invalidations).toBe(1);
  });

  it("rejects an invalid specimen date before invoking persistence", async () => {
    let repositoryCalls = 0;
    const dependencies = Layer.mergeAll(
      Layer.succeed(
        Repository,
        repository(() => {
          repositoryCalls += 1;
          return Effect.succeed("reading-1");
        }),
      ),
      Layer.succeed(DataCache, cache(unused)),
    );
    const bloodwork = bloodworkLayer.pipe(Layer.provide(dependencies));
    const program = Effect.gen(function* () {
      const service = yield* Bloodwork;
      return yield* service.saveReading({
        ...emptyReading,
        date: "2026-02-30",
      });
    }).pipe(Effect.provide(bloodwork));

    await expect(Effect.runPromise(program)).rejects.toMatchObject({
      message: "A valid specimen date is required",
    });
    expect(repositoryCalls).toBe(0);
  });

  it("keeps repository validation for empty readings as a typed failure", async () => {
    const dependencies = Layer.mergeAll(
      Layer.succeed(
        Repository,
        repository(() =>
          Effect.fail(
            new ValidationError({
              operation: "Repository.saveReading",
              message: "At least one measurement is required",
            }),
          ),
        ),
      ),
      Layer.succeed(DataCache, cache(unused)),
    );
    const bloodwork = bloodworkLayer.pipe(Layer.provide(dependencies));
    const program = Effect.gen(function* () {
      const service = yield* Bloodwork;
      return yield* service.saveReading(emptyReading);
    }).pipe(Effect.provide(bloodwork));

    await expect(Effect.runPromise(program)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
