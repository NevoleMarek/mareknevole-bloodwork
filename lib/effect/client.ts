import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { RequestDecodeError } from "@/lib/effect/errors";

/** Browser bridge: untrusted fetch JSON is decoded before React consumes it. */
export const decodeResponseJson = <
  S extends Schema.ConstraintDecoder<unknown, never>,
>(
  response: Response,
  schema: S,
  operation: string,
): Promise<S["Type"]> =>
  Effect.runPromise(
    Effect.tryPromise({
      try: () => response.json(),
      catch: () =>
        new RequestDecodeError({ operation, message: "Invalid response JSON" }),
    }).pipe(
      Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body)),
      Effect.mapError(
        () =>
          new RequestDecodeError({
            operation,
            message: "Invalid response shape",
          }),
      ),
    ),
  );
