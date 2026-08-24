import * as Effect from "effect/Effect";

import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { Health } from "@/lib/effect/services";
import { HealthImportRequest } from "@/lib/schemas/wire";

export async function POST(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          HealthImportRequest,
          "health-import.request",
        );
        const health = yield* Health;
        return yield* health.import(body);
      }),
    ),
    (result) => Response.json(result),
  );
}
