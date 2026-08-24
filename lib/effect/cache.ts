import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  getCachedBiomarkerTrend,
  getCachedDashboard,
  getCachedFirstChangelogPage,
  getCachedHealth,
  getCachedVisibleVocabularyKeys,
  invalidateDashboard,
  invalidateHealth,
} from "@/lib/data-cache";
import type { Period } from "@/lib/period";
import { PersistenceError } from "@/lib/effect/errors";
import type { ChangelogPage } from "@/types/bloodwork";
import type { HealthData } from "@/types/health";

export interface DataCacheContract {
  readonly dashboard: () => Effect.Effect<
    Awaited<ReturnType<typeof getCachedDashboard>>,
    PersistenceError
  >;
  readonly firstChangelogPage: () => Effect.Effect<
    ChangelogPage,
    PersistenceError
  >;
  readonly biomarkerTrend: (
    key: string,
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getCachedBiomarkerTrend>>,
    PersistenceError
  >;
  readonly visibleVocabularyKeys: () => Effect.Effect<
    string[],
    PersistenceError
  >;
  readonly health: (
    period: Period,
  ) => Effect.Effect<HealthData, PersistenceError>;
  readonly invalidateDashboard: () => Effect.Effect<void, PersistenceError>;
  readonly invalidateHealth: () => Effect.Effect<void, PersistenceError>;
}

export class DataCache extends Context.Service<DataCache, DataCacheContract>()(
  "Bloodwork/DataCache",
) {}

const promise = <A>(
  operation: string,
  run: () => Promise<A>,
): Effect.Effect<A, PersistenceError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new PersistenceError({ operation, cause }),
  });

export const layer = Layer.succeed(
  DataCache,
  DataCache.of({
    dashboard: Effect.fn("DataCache.dashboard")(function* () {
      return yield* promise("DataCache.dashboard", getCachedDashboard);
    }),
    firstChangelogPage: Effect.fn("DataCache.firstChangelogPage")(function* () {
      return yield* promise(
        "DataCache.firstChangelogPage",
        getCachedFirstChangelogPage,
      );
    }),
    biomarkerTrend: Effect.fn("DataCache.biomarkerTrend")(function* (
      key: string,
    ) {
      return yield* promise("DataCache.biomarkerTrend", () =>
        getCachedBiomarkerTrend(key),
      );
    }),
    visibleVocabularyKeys: Effect.fn("DataCache.visibleVocabularyKeys")(
      function* () {
        return yield* promise(
          "DataCache.visibleVocabularyKeys",
          getCachedVisibleVocabularyKeys,
        );
      },
    ),
    health: Effect.fn("DataCache.health")(function* (period: Period) {
      return yield* promise("DataCache.health", () => getCachedHealth(period));
    }),
    invalidateDashboard: Effect.fn("DataCache.invalidateDashboard")(
      function* () {
        yield* promise("DataCache.invalidateDashboard", async () => {
          invalidateDashboard();
        });
      },
    ),
    invalidateHealth: Effect.fn("DataCache.invalidateHealth")(function* () {
      yield* promise("DataCache.invalidateHealth", async () => {
        invalidateHealth();
      });
    }),
  }),
);
