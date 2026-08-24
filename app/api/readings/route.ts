import * as Effect from "effect/Effect";

import { Bloodwork, Dashboard } from "@/lib/effect/services";
import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { readingCursor } from "@/lib/effect/query";
import { IdRequest, SaveReadingRequest } from "@/lib/schemas/wire";

export async function GET(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const cursor = yield* readingCursor(request);
        const dashboard = yield* Dashboard;
        return yield* dashboard.getReadingPage(cursor);
      }),
    ),
  );
}

export async function DELETE(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(request, IdRequest, "readings.delete");
        const bloodwork = yield* Bloodwork;
        yield* bloodwork.deleteReading(body.id);
        return { ok: true };
      }),
    ),
  );
}

export async function POST(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          SaveReadingRequest,
          "readings.save",
        );
        const bloodwork = yield* Bloodwork;
        const readingId = yield* bloodwork.saveReading(body);
        return { readingId };
      }),
    ),
  );
}
