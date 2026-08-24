import * as Effect from "effect/Effect";

import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { ProviderWorkflows } from "@/lib/effect/services";
import { ResearchRequest } from "@/lib/schemas/wire";

export async function POST(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          ResearchRequest,
          "research.request",
        );
        const workflows = yield* ProviderWorkflows;
        return yield* workflows.research(body);
      }),
    ),
  );
}
