import * as Effect from "effect/Effect";

import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { Health } from "@/lib/effect/services";
import { HealthVisibilityRequest } from "@/lib/schemas/wire";

export async function GET() {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const health = yield* Health;
        return yield* health.getConfigs();
      }),
    ),
  );
}

export async function PATCH(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          HealthVisibilityRequest,
          "health-config.visibility",
        );
        const health = yield* Health;
        yield* health.updateVisibility(body);
        return { ok: true };
      }),
    ),
  );
}
