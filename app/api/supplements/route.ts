import * as Effect from "effect/Effect";

import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { Supplements } from "@/lib/effect/services";
import {
  SupplementCreateRequest,
  SupplementDeleteRequest,
  SupplementUpdateRequest,
} from "@/lib/schemas/wire";

export async function GET() {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const supplements = yield* Supplements;
        return yield* supplements.get();
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
          SupplementCreateRequest,
          "supplements.create",
        );
        const supplements = yield* Supplements;
        yield* supplements.create(body);
        return { ok: true };
      }),
    ),
  );
}

export async function PUT(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          SupplementUpdateRequest,
          "supplements.update",
        );
        const supplements = yield* Supplements;
        yield* supplements.update(body);
        return { ok: true };
      }),
    ),
  );
}

export async function DELETE(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(
          request,
          SupplementDeleteRequest,
          "supplements.delete",
        );
        const supplements = yield* Supplements;
        yield* supplements.remove(body);
        return { ok: true };
      }),
    ),
  );
}
