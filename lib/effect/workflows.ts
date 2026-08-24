import * as Effect from "effect/Effect";

import { NotFoundError, RequestDecodeError } from "@/lib/effect/errors";
import { Bloodwork, Dashboard, Supplements } from "@/lib/effect/services";
import { ChangelogUpdateRequest, SaveReadingRequest } from "@/lib/schemas/wire";
import type { Period, TrendPeriod } from "@/lib/period";
import type { ChangelogCursor, ReadingCursor } from "@/types/bloodwork";

export const dataEffect = Effect.fn("Workflows.exportData")(function* () {
  const dashboard = yield* Dashboard;
  return yield* dashboard.getData();
});

export const getReadingsEffect = Effect.fn("Workflows.getReadings")(function* (
  cursor: ReadingCursor | null,
) {
  const dashboard = yield* Dashboard;
  return yield* dashboard.getReadingPage(cursor);
});

export const deleteReadingEffect = Effect.fn("Workflows.deleteReading")(
  function* (id: string) {
    const bloodwork = yield* Bloodwork;
    yield* bloodwork.deleteReading(id);
    return { ok: true };
  },
);

export const saveReadingEffect = Effect.fn("Workflows.saveReading")(function* (
  body: SaveReadingRequest,
) {
  const bloodwork = yield* Bloodwork;
  const readingId = yield* bloodwork.saveReading(body);
  return { readingId };
});

export const changelogEffect = Effect.fn("Workflows.getChangelog")(function* (
  cursor: ChangelogCursor | null,
) {
  const dashboard = yield* Dashboard;
  return cursor === null
    ? yield* dashboard.getFirstChangelogPage()
    : yield* dashboard.getChangelogPage(cursor);
});

export const healthEffect = Effect.fn("Workflows.getHealth")(function* (
  selectedPeriod: Period,
) {
  const dashboard = yield* Dashboard;
  return yield* dashboard.getHealth(selectedPeriod);
});

export const trendEffect = Effect.fn("Workflows.getTrend")(function* (
  key: string,
  period: TrendPeriod,
) {
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
  const points = yield* dashboard.getTrend(key, period);
  return { points };
});

export const updateChangelogEffect = Effect.fn("Workflows.updateChangelog")(
  function* (id: string, body: ChangelogUpdateRequest) {
    const supplements = yield* Supplements;
    yield* supplements.updateChangelog(id, body.description);
  },
);

export const deleteChangelogEffect = Effect.fn("Workflows.deleteChangelog")(
  function* (id: string) {
    const supplements = yield* Supplements;
    yield* supplements.deleteChangelog(id);
  },
);
