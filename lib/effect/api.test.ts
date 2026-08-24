// @vitest-environment node

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { afterAll, describe, expect, it } from "vitest";

import { BloodworkApi, makeBiomarkerKey } from "@/lib/effect/api";
import {
  ApiBadGateway,
  ApiBadRequest,
  ApiConflict,
  ApiNotFound,
  ApiServiceUnavailable,
  toApiError,
} from "@/lib/effect/api-errors";
import {
  handleApiRequestWith,
  makeApiWebHandler,
} from "@/lib/effect/api-server";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  PersistenceError,
  ProviderRejected,
} from "@/lib/effect/errors";
import {
  Auth,
  Bloodwork,
  Dashboard,
  type DashboardContract,
  Health,
  ProviderWorkflows,
  Supplements,
} from "@/lib/effect/services";

const unused = () => Effect.die("unused service operation");

const makeDashboard = (
  getData: DashboardContract["getData"],
): DashboardContract => ({
  getDashboard: unused,
  getData,
  getTrend: () => Effect.succeed([]),
  getVisibleKeys: () => Effect.succeed(["glucose"]),
  getHealth: () => Effect.succeed({ metrics: [], configs: [] }),
  getFirstChangelogPage: () =>
    Effect.succeed({ entries: [], nextCursor: null }),
  getChangelogPage: () => Effect.succeed({ entries: [], nextCursor: null }),
  getReadingPage: () => Effect.succeed({ entries: [], nextCursor: null }),
});

const sharedServices = Layer.mergeAll(
  Layer.succeed(
    Bloodwork,
    Bloodwork.of({
      getVocabulary: () => Effect.succeed([]),
      saveReading: () => Effect.succeed("reading-1"),
      deleteReading: unused,
      createVocabulary: unused,
      updateVocabulary: unused,
      deleteVocabulary: unused,
    }),
  ),
  Layer.succeed(
    Supplements,
    Supplements.of({
      get: () => Effect.succeed({ supplements: [], changelog: [] }),
      create: unused,
      update: unused,
      remove: unused,
      updateChangelog: unused,
      deleteChangelog: unused,
    }),
  ),
  Layer.succeed(
    Health,
    Health.of({
      getConfigs: () => Effect.succeed([]),
      updateVisibility: unused,
      import: () => Effect.succeed({ saved: 0, metrics: 0, days: 0 }),
    }),
  ),
  Layer.succeed(
    Auth,
    Auth.of({
      authenticate: () =>
        Effect.succeed({ token: "test-session", secure: false }),
    }),
  ),
  Layer.succeed(
    ProviderWorkflows,
    ProviderWorkflows.of({
      extract: () => Effect.succeed({ date: "2026-08-24", variables: [] }),
      map: unused,
      research: unused,
    }),
  ),
);

const services = Layer.merge(
  sharedServices,
  Layer.succeed(
    Dashboard,
    Dashboard.of(
      makeDashboard(() =>
        Effect.succeed({ vocabulary: { entries: [] }, readings: [] }),
      ),
    ),
  ),
);

const { dispose, handler } = makeApiWebHandler(services);
const localFetch: typeof globalThis.fetch = (input, init) =>
  handler(new Request(input, init));

const runClient = <A, E>(
  operation: (
    client: HttpApiClient.ForApi<typeof BloodworkApi>,
  ) => Effect.Effect<A, E>,
): Promise<A> =>
  Effect.runPromise(
    HttpApiClient.make(BloodworkApi, {
      baseUrl: "https://bloodwork.test",
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.flatMap(operation),
      Effect.provideService(FetchHttpClient.Fetch, localFetch),
    ),
  );

afterAll(() => dispose());

describe("Bloodwork HttpApi", () => {
  it("serves declared endpoints through the Fetch handler", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/readings/export"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      vocabulary: { entries: [] },
      readings: [],
    });
  });

  it("rejects invalid query values before invoking handlers", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/dashboard/health?period=forever"),
    );

    expect(response.status).toBe(400);
  });

  it("encodes declared transport errors for generated clients", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/changelog?date=2026-01-01"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      _tag: "Bloodwork.ApiBadRequest",
      error: "Invalid cursor",
    });

    await expect(
      runClient((client) =>
        client.changelog.list({ query: { date: "2026-01-01" } }),
      ),
    ).rejects.toBeInstanceOf(ApiBadRequest);
  });

  it("projects authentication failures to the declared unauthorized error", async () => {
    const authServices = Layer.merge(
      services,
      Layer.succeed(
        Auth,
        Auth.of({
          authenticate: () =>
            Effect.fail(
              new AuthenticationError({ reason: "invalid-password" }),
            ),
        }),
      ),
    );
    const { dispose: disposeAuth, handler: authHandler } =
      makeApiWebHandler(authServices);
    try {
      const response = await authHandler(
        new Request("https://bloodwork.test/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: "wrong" }),
        }),
      );
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        _tag: "Bloodwork.ApiUnauthorized",
        error: "Invalid password",
      });
    } finally {
      await disposeAuth();
    }
  });

  it("rejects malformed JSON at the HttpApi payload boundary", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/readings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("encodes multipart uploads through the generated client", async () => {
    const formData = new FormData();
    formData.append(
      "pdf",
      new File(["pdf"], "panel.pdf", { type: "application/pdf" }),
    );

    await expect(
      runClient((client) => client.import.extract({ payload: formData })),
    ).resolves.toEqual({ date: "2026-08-24", variables: [] });
  });

  it("sets the session cookie through the Effect response pipeline", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "bloodwork-session=test-session",
    );
  });

  it("removes the session cookie through the Effect response pipeline", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/session", { method: "DELETE" }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain(
      "bloodwork-session=; Max-Age=0",
    );
  });

  it("serves OpenAPI from the same contract", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/openapi.json"),
    );
    const document = await response.json();

    expect(response.status).toBe(200);
    expect(document).toHaveProperty("paths./api/readings.get");
    expect(document).toHaveProperty("paths./api/readings.post");
    expect(document).toHaveProperty("paths./api/import/extract.post");
    expect(document).toHaveProperty("components.schemas.ReadingPage");
    expect(document).toHaveProperty("components.schemas.SaveReadingRequest");
  });

  it("builds encoded URLs from the contract", () => {
    const urls = HttpApiClient.urlBuilder(BloodworkApi);

    expect(
      urls.changelog.list({
        query: {
          date: "2026-01-01",
          createdAt: "2026-01-01T10:00:00Z",
          id: "entry-1",
        },
      }),
    ).toBe(
      "/api/changelog?date=2026-01-01&createdAt=2026-01-01T10%3A00%3A00Z&id=entry-1",
    );
    expect(
      urls.dashboard.trend({ params: { key: makeBiomarkerKey("a/b") } }),
    ).toBe("/api/biomarkers/a%2Fb/trend");
  });
});

describe("HttpApi error projection", () => {
  it("keeps internal failures out of transport responses", () => {
    expect(
      toApiError(
        new PersistenceError({ operation: "test", cause: new Error("d1") }),
      ),
    ).toBeInstanceOf(ApiServiceUnavailable);
    expect(
      toApiError(new ProviderRejected({ operation: "test", status: 429 })),
    ).toBeInstanceOf(ApiBadGateway);
    expect(
      toApiError(new ConflictError({ resource: "reading", id: "r1" })),
    ).toBeInstanceOf(ApiConflict);
  });

  it("preserves the public biomarker message", () => {
    const error = toApiError(
      new NotFoundError({ resource: "biomarker", id: "glucose" }),
    );

    expect(error).toBeInstanceOf(ApiNotFound);
    expect(error.error).toBe("Unknown biomarker");
  });
});

describe("Next request lifetime", () => {
  it("acquires and disposes application services for every request", async () => {
    let acquired = 0;
    let disposed = 0;
    const requestDashboard = Layer.effect(
      Dashboard,
      Effect.acquireRelease(
        Effect.sync(() => {
          const requestId = ++acquired;
          return Dashboard.of(
            makeDashboard(() =>
              Effect.succeed({
                vocabulary: { entries: [] },
                readings: [
                  {
                    date: "2026-08-24",
                    source: `request-${requestId}`,
                    measurements: [],
                  },
                ],
              }),
            ),
          );
        }),
        () =>
          Effect.sync(() => {
            disposed += 1;
          }),
      ),
    );
    const requestServices = Layer.merge(sharedServices, requestDashboard);

    const first = await handleApiRequestWith(
      new Request("https://bloodwork.test/api/readings/export"),
      requestServices,
    );
    const second = await handleApiRequestWith(
      new Request("https://bloodwork.test/api/readings/export"),
      requestServices,
    );

    await expect(first.json()).resolves.toHaveProperty(
      "readings.0.source",
      "request-1",
    );
    await expect(second.json()).resolves.toHaveProperty(
      "readings.0.source",
      "request-2",
    );
    expect(acquired).toBe(2);
    expect(disposed).toBe(2);
  });
});
