import * as Effect from "effect/Effect";
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
export const runApi = <A, E>(
  operation: (client: BloodworkApiClient) => Effect.Effect<A, E>,
): Promise<A> =>
  Effect.runPromise(
    HttpApiClient.make(BloodworkApi, {
      baseUrl: globalThis.location.origin,
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.flatMap(operation),
      Effect.provideService(FetchHttpClient.Fetch, globalThis.fetch),
    ),
  );
