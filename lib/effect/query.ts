import * as Effect from "effect/Effect";

import { isPeriod, type Period } from "@/lib/period";
import { RequestDecodeError } from "@/lib/effect/errors";
import type { ChangelogCursor, ReadingCursor } from "@/types/bloodwork";

export const readingCursor = (
  request: Request,
): Effect.Effect<ReadingCursor | null, RequestDecodeError> => {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const id = params.get("id");
  const hasDate = params.has("date");
  const hasId = params.has("id");
  const hasCursor = hasDate || hasId;
  if (hasCursor && !(hasDate && hasId)) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "readings.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  if (!hasCursor) return Effect.succeed(null);
  if (date === null || id === null) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "readings.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  return Effect.succeed({ date, id });
};

export const changelogCursor = (
  request: Request,
): Effect.Effect<ChangelogCursor | null, RequestDecodeError> => {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const createdAt = params.get("createdAt");
  const id = params.get("id");
  const hasDate = params.has("date");
  const hasCreatedAt = params.has("createdAt");
  const hasId = params.has("id");
  const hasCursor = hasDate || hasCreatedAt || hasId;
  if (hasCursor && !(hasDate && hasCreatedAt && hasId)) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "changelog.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  if (!hasCursor) return Effect.succeed(null);
  if (date === null || createdAt === null || id === null) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "changelog.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  return Effect.succeed({ date, createdAt, id });
};

export const period = (
  request: Request,
): Effect.Effect<Period, RequestDecodeError> => {
  const value = new URL(request.url).searchParams.get("period");
  return isPeriod(value)
    ? Effect.succeed(value)
    : Effect.fail(
        new RequestDecodeError({
          operation: "health.period",
          message: "Invalid period",
        }),
      );
};
