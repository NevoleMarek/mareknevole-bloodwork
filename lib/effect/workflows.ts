import * as Effect from "effect/Effect";

import { NotFoundError, RequestDecodeError } from "@/lib/effect/errors";
import { decodeJson } from "@/lib/effect/http";
import { changelogCursor, period, readingCursor } from "@/lib/effect/query";
import { Bloodwork, Dashboard, Supplements } from "@/lib/effect/services";
import {
  ChangelogUpdateRequest,
  IdRequest,
  SaveReadingRequest,
} from "@/lib/schemas/wire";

export const dataEffect = Effect.gen(function* () {
  const dashboard = yield* Dashboard;
  return yield* dashboard.getData();
});

export const getReadingsEffect = (request: Request) =>
  Effect.gen(function* () {
    const cursor = yield* readingCursor(request);
    const dashboard = yield* Dashboard;
    return yield* dashboard.getReadingPage(cursor);
  });

export const deleteReadingEffect = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* decodeJson(request, IdRequest, "readings.delete");
    const bloodwork = yield* Bloodwork;
    yield* bloodwork.deleteReading(body.id);
    return { ok: true };
  });

export const saveReadingEffect = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* decodeJson(
      request,
      SaveReadingRequest,
      "readings.save",
    );
    const bloodwork = yield* Bloodwork;
    const readingId = yield* bloodwork.saveReading(body);
    return { readingId };
  });

export const changelogEffect = (request: Request) =>
  Effect.gen(function* () {
    const cursor = yield* changelogCursor(request);
    const dashboard = yield* Dashboard;
    return cursor === null
      ? yield* dashboard.getFirstChangelogPage()
      : yield* dashboard.getChangelogPage(cursor);
  });

export const healthEffect = (request: Request) =>
  Effect.gen(function* () {
    const selectedPeriod = yield* period(request);
    const dashboard = yield* Dashboard;
    return yield* dashboard.getHealth(selectedPeriod);
  });

export type TrendRouteParams = { readonly key: string };

export const trendEffect = (params: Promise<TrendRouteParams>) =>
  Effect.gen(function* () {
    const { key } = yield* Effect.promise(() => params);
    if (key.length === 0) {
      return yield* Effect.fail(
        new RequestDecodeError({
          operation: "public.trends.params",
          message: "Invalid biomarker key",
        }),
      );
    }
    const dashboard = yield* Dashboard;
    const visibleKeys = yield* dashboard.getVisibleKeys();
    if (!visibleKeys.includes(key)) {
      return yield* Effect.fail(
        new NotFoundError({ resource: "biomarker", id: key }),
      );
    }
    const points = yield* dashboard.getTrend(key);
    return { points };
  });

export const updateChangelogEffect = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* decodeJson(
      request,
      ChangelogUpdateRequest,
      "changelog.update",
    );
    const supplements = yield* Supplements;
    yield* supplements.updateChangelog(body.id, body.description);
    return { ok: true };
  });

export const deleteChangelogEffect = (request: Request) =>
  Effect.gen(function* () {
    const body = yield* decodeJson(request, IdRequest, "changelog.delete");
    const supplements = yield* Supplements;
    yield* supplements.deleteChangelog(body.id);
    return { ok: true };
  });
