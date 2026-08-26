import * as Effect from "effect/Effect";

import {
  AuthenticationError,
  type ConfigurationError,
  type PersistenceError,
} from "@/lib/effect/errors";
import type { AuthContract, HealthContract } from "@/lib/effect/services";
import type { HealthMetricConfig } from "@/lib/schemas/domain";

export const authorizedHealthConfigs = (
  session: string,
  validate: AuthContract["validate"],
  getConfigs: HealthContract["getConfigs"],
  redirectToAdmin: () => never,
): Effect.Effect<
  HealthMetricConfig[],
  ConfigurationError | PersistenceError | AuthenticationError
> =>
  validate(session).pipe(
    Effect.flatMap(() => getConfigs()),
    Effect.catchTag("Bloodwork.AuthenticationError", (error) =>
      error.reason === "invalid-session"
        ? Effect.sync(redirectToAdmin)
        : Effect.fail(error),
    ),
  );
