import * as Effect from "effect/Effect";

import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { Dashboard } from "@/lib/effect/services";

export async function GET() {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const dashboard = yield* Dashboard;
        return yield* dashboard.getData();
      }),
    ),
  );
}
