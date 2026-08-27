import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import {
  apiErrorMessage,
  BloodworkApi,
  type BloodworkApiClient,
} from "@/lib/effect/api";

export const apiUrls = HttpApiClient.urlBuilder(BloodworkApi);

export { apiErrorMessage };

/** Run a generated, schema-decoding client operation against the Bloodwork API. */
export interface RunApiOptions {
  readonly signal?: AbortSignal;
}

export const runApi = <A, E>(
  operation: (client: BloodworkApiClient) => Effect.Effect<A, E>,
  options: RunApiOptions = {},
): Promise<A> => {
  const request = HttpApiClient.make(BloodworkApi, {
    baseUrl: globalThis.location.origin,
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.flatMap(operation),
    Effect.provideService(FetchHttpClient.Fetch, globalThis.fetch),
  );

  const signal = options.signal;
  if (signal === undefined) return Effect.runPromise(request);

  if (signal.aborted) {
    return Promise.reject(
      new DOMException("The operation was aborted", "AbortError"),
    );
  }

  const fiber = Effect.runFork(request);
  return new Promise<A>((resolve, reject) => {
    const onAbort = () => fiber.interruptUnsafe();
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    Effect.runPromise(Fiber.join(fiber)).then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
};
