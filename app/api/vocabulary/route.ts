import * as Effect from "effect/Effect";

import { Bloodwork } from "@/lib/effect/services";
import { decodeJson, provideAppLayer, runRoute } from "@/lib/effect/http";
import { KeyRequest, VocabularyEntryRequest } from "@/lib/schemas/wire";

export async function GET() {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const bloodwork = yield* Bloodwork;
        return { entries: yield* bloodwork.getVocabulary() };
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
          VocabularyEntryRequest,
          "vocabulary.create",
        );
        const bloodwork = yield* Bloodwork;
        yield* bloodwork.createVocabulary(body.entry);
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
          VocabularyEntryRequest,
          "vocabulary.update",
        );
        const bloodwork = yield* Bloodwork;
        yield* bloodwork.updateVocabulary(body.entry);
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
          KeyRequest,
          "vocabulary.delete",
        );
        const bloodwork = yield* Bloodwork;
        yield* bloodwork.deleteVocabulary(body.key);
        return { ok: true };
      }),
    ),
  );
}
