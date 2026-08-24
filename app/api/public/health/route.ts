import * as Effect from "effect/Effect";

import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { period } from "@/lib/effect/query";
import { Dashboard } from "@/lib/effect/services";

export async function GET(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const selectedPeriod = yield* period(request);
        const dashboard = yield* Dashboard;
        return yield* dashboard.getHealth(selectedPeriod);
      }),
    ),
  );
}
