import * as Effect from "effect/Effect";

import { NotFoundError } from "@/lib/effect/errors";
import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { Dashboard } from "@/lib/effect/services";

type TrendRouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: TrendRouteContext) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const { key } = yield* Effect.tryPromise({
          try: () => params,
          catch: () =>
            new NotFoundError({ resource: "biomarker", id: "params" }),
        });
        const dashboard = yield* Dashboard;
        const visibleKeys = yield* dashboard.getVisibleKeys();
        if (!visibleKeys.includes(key)) {
          return yield* Effect.fail(
            new NotFoundError({ resource: "biomarker", id: key }),
          );
        }
        const points = yield* dashboard.getTrend(key);
        return { points };
      }),
    ),
  );
}
