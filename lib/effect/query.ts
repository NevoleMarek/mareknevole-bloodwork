import * as Effect from "effect/Effect";

import { RequestDecodeError } from "@/lib/effect/errors";
import type {
  ChangelogCursorQuery,
  ReadingCursorQuery,
} from "@/lib/schemas/wire";
import type { ChangelogCursor, ReadingCursor } from "@/types/bloodwork";

export const readingCursor = (
  query: ReadingCursorQuery,
): Effect.Effect<ReadingCursor | null, RequestDecodeError> => {
  const hasDate = query.date !== undefined;
  const hasId = query.id !== undefined;
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
  if (query.date === undefined || query.id === undefined) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "readings.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  return Effect.succeed({ date: query.date, id: query.id });
};

export const changelogCursor = (
  query: ChangelogCursorQuery,
): Effect.Effect<ChangelogCursor | null, RequestDecodeError> => {
  const hasDate = query.date !== undefined;
  const hasCreatedAt = query.createdAt !== undefined;
  const hasId = query.id !== undefined;
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
  if (
    query.date === undefined ||
    query.createdAt === undefined ||
    query.id === undefined
  ) {
    return Effect.fail(
      new RequestDecodeError({
        operation: "changelog.cursor",
        message: "Invalid cursor",
      }),
    );
  }
  return Effect.succeed({
    date: query.date,
    createdAt: query.createdAt,
    id: query.id,
  });
};
