import * as Effect from "effect/Effect";

import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { changelogCursor } from "@/lib/effect/query";
import { Dashboard } from "@/lib/effect/services";

export async function GET(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const cursor = yield* changelogCursor(request);
        const dashboard = yield* Dashboard;
        return cursor === null
          ? yield* dashboard.getFirstChangelogPage()
          : yield* dashboard.getChangelogPage(cursor);
      }),
    ),
  );
}
