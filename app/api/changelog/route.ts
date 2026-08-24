import * as Effect from "effect/Effect";

import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { Supplements } from "@/lib/effect/services";
import { ChangelogUpdateRequest, IdRequest } from "@/lib/schemas/wire";

export async function PUT(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          ChangelogUpdateRequest,
          "changelog.update",
        );
        const supplements = yield* Supplements;
        yield* supplements.updateChangelog(body.id, body.description);
        return { ok: true };
      }),
    ),
  );
}

export async function DELETE(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(request, IdRequest, "changelog.delete");
        const supplements = yield* Supplements;
        yield* supplements.deleteChangelog(body.id);
        return { ok: true };
      }),
    ),
  );
}
