// @vitest-environment node

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient, HttpApiError } from "effect/unstable/httpapi";
import { afterAll, describe, expect, it } from "vitest";

import {
  BloodworkApi,
  makeBiomarkerKey,
  makeVocabularyKey,
} from "@/lib/effect/api";
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
  options: {
    readonly getTrend?: DashboardContract["getTrend"];
    readonly getVisibleKeys?: DashboardContract["getVisibleKeys"];
    readonly getFirstChangelogPage?: DashboardContract["getFirstChangelogPage"];
    readonly getChangelogPage?: DashboardContract["getChangelogPage"];
    readonly getReadingPage?: DashboardContract["getReadingPage"];
  } = {},
): DashboardContract => ({
  getDashboard: unused,
  getData,
  getTrend: options.getTrend ?? (() => Effect.succeed([])),
  getVisibleKeys: options.getVisibleKeys ?? (() => Effect.succeed(["glucose"])),
  getHealth: () => Effect.succeed({ metrics: [], configs: [] }),
  getFirstChangelogPage:
    options.getFirstChangelogPage ??
    (() => Effect.succeed({ entries: [], nextCursor: null })),
  getChangelogPage:
    options.getChangelogPage ??
    (() => Effect.succeed({ entries: [], nextCursor: null })),
  getReadingPage:
    options.getReadingPage ??
    (() => Effect.succeed({ entries: [], nextCursor: null })),
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
      get: () => Effect.succeed([]),
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
      validate: (token) =>
        token === "test-session"
          ? Effect.succeed(undefined)
          : Effect.fail(new AuthenticationError({ reason: "invalid-session" })),
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
  (() => {
    const request = new Request(input, init);
    if (!request.headers.has("cookie")) {
      request.headers.set("cookie", "bloodwork-session=test-session");
    }
    return handler(request);
  })();

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

const runClientWithHandler = <A, E>(
  endpointHandler: typeof handler,
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
      Effect.provideService(FetchHttpClient.Fetch, (input, init) => {
        const request = new Request(input, init);
        if (!request.headers.has("cookie")) {
          request.headers.set("cookie", "bloodwork-session=test-session");
        }
        return endpointHandler(request);
      }),
    ),
  );

afterAll(() => dispose());

describe("Bloodwork HttpApi", () => {
  it("serves declared endpoints through the Fetch handler", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/readings/export"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      _tag: "Bloodwork.ApiUnauthorized",
      error: "Invalid session",
    });

    const authenticated = await handler(
      new Request("https://bloodwork.test/api/readings/export", {
        headers: { cookie: "bloodwork-session=test-session" },
      }),
    );
    expect(authenticated.status).toBe(200);
    await expect(authenticated.json()).resolves.toEqual({
      vocabulary: { entries: [] },
      readings: [],
    });
  });

  it("encodes JSON payloads through the generated client", async () => {
    await expect(
      runClient((client) =>
        client.session.create({ payload: { password: "secret" } }),
      ),
    ).resolves.toEqual({ authenticated: true });
  });

  it("returns paginated resource pages and next cursors", async () => {
    const pagedServices = Layer.merge(
      services,
      Layer.succeed(
        Dashboard,
        Dashboard.of(
          makeDashboard(
            () => Effect.succeed({ vocabulary: { entries: [] }, readings: [] }),
            {
              getReadingPage: () =>
                Effect.succeed({
                  entries: [
                    {
                      id: "reading-1",
                      date: "2026-08-24",
                      source: "lab",
                      measurementCount: 1,
                    },
                  ],
                  nextCursor: { date: "2026-08-24", id: "reading-1" },
                }),
              getFirstChangelogPage: () =>
                Effect.succeed({
                  entries: [
                    {
                      id: "entry-1",
                      date: "2026-08-24",
                      description: "Started",
                      createdAt: "2026-08-24T10:00:00Z",
                    },
                  ],
                  nextCursor: {
                    date: "2026-08-24",
                    createdAt: "2026-08-24T10:00:00Z",
                    id: "entry-1",
                  },
                }),
            },
          ),
        ),
      ),
    );
    const { dispose: disposePaged, handler: pagedHandler } =
      makeApiWebHandler(pagedServices);
    try {
      await expect(
        runClientWithHandler(pagedHandler, (client) =>
          client.readings.list({ query: {} }),
        ),
      ).resolves.toMatchObject({
        entries: [{ id: "reading-1" }],
        nextCursor: { id: "reading-1" },
      });
      await expect(
        runClientWithHandler(pagedHandler, (client) =>
          client.changelog.list({ query: {} }),
        ),
      ).resolves.toMatchObject({
        entries: [{ id: "entry-1" }],
        nextCursor: { id: "entry-1" },
      });
    } finally {
      await disposePaged();
    }
  });

  it("rejects malformed session cookies at the API boundary", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/readings/export", {
        headers: { cookie: "bloodwork-session=not-a-session" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      _tag: "Bloodwork.ApiUnauthorized",
      error: "Invalid session",
    });
  });

  it("rejects invalid query values before invoking handlers", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/dashboard/health?period=forever"),
    );

    expect(response.status).toBe(400);
  });

  it("decodes protocol 400 responses from the generated client", async () => {
    const malformedFetch: typeof globalThis.fetch = () =>
      handler(
        new Request(
          "https://bloodwork.test/api/dashboard/health?period=forever",
        ),
      );

    await expect(
      Effect.runPromise(
        HttpApiClient.make(BloodworkApi, {
          baseUrl: "https://bloodwork.test",
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.flatMap((client) =>
            client.dashboard.health({ query: { period: "1Y" } }),
          ),
          Effect.provideService(FetchHttpClient.Fetch, malformedFetch),
        ),
      ),
    ).rejects.toBeInstanceOf(HttpApiError.BadRequest);

    const malformedSessionFetch: typeof globalThis.fetch = () =>
      handler(
        new Request("https://bloodwork.test/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      );
    await expect(
      Effect.runPromise(
        HttpApiClient.make(BloodworkApi, {
          baseUrl: "https://bloodwork.test",
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.flatMap((client) =>
            client.session.create({ payload: { password: "secret" } }),
          ),
          Effect.provideService(FetchHttpClient.Fetch, malformedSessionFetch),
        ),
      ),
    ).rejects.toBeInstanceOf(HttpApiError.BadRequest);

    const malformedReadingsFetch: typeof globalThis.fetch = () =>
      handler(
        new Request("https://bloodwork.test/api/readings", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: "bloodwork-session=test-session",
          },
          body: "{",
        }),
      );
    await expect(
      Effect.runPromise(
        HttpApiClient.make(BloodworkApi, {
          baseUrl: "https://bloodwork.test",
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.flatMap((client) =>
            client.readings.create({
              payload: {
                date: "2026-08-24",
                source: "lab",
                measurements: [],
                newVocabulary: [],
              },
            }),
          ),
          Effect.provideService(FetchHttpClient.Fetch, malformedReadingsFetch),
        ),
      ),
    ).rejects.toBeInstanceOf(HttpApiError.BadRequest);

    const malformedHealthFetch: typeof globalThis.fetch = () =>
      handler(
        new Request("https://bloodwork.test/api/health/metrics/sleep", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            cookie: "bloodwork-session=test-session",
          },
          body: "{",
        }),
      );
    await expect(
      Effect.runPromise(
        HttpApiClient.make(BloodworkApi, {
          baseUrl: "https://bloodwork.test",
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.flatMap((client) =>
            client.health.updateVisibility({
              params: { metric: "sleep" },
              payload: { visible: true },
            }),
          ),
          Effect.provideService(FetchHttpClient.Fetch, malformedHealthFetch),
        ),
      ),
    ).rejects.toBeInstanceOf(HttpApiError.BadRequest);
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

  it("decodes representative resource and upstream failures", async () => {
    const notFoundServices = Layer.merge(
      services,
      Layer.succeed(
        Dashboard,
        Dashboard.of(
          makeDashboard(
            () => Effect.succeed({ vocabulary: { entries: [] }, readings: [] }),
            { getVisibleKeys: () => Effect.succeed([]) },
          ),
        ),
      ),
    );
    const { dispose: disposeNotFound, handler: notFoundHandler } =
      makeApiWebHandler(notFoundServices);
    try {
      await expect(
        runClientWithHandler(notFoundHandler, (client) =>
          client.dashboard.trend({
            params: { key: makeBiomarkerKey("glucose") },
            query: { period: "1Y" },
          }),
        ),
      ).rejects.toBeInstanceOf(ApiNotFound);
    } finally {
      await disposeNotFound();
    }

    const conflictServices = Layer.merge(
      services,
      Layer.succeed(
        Bloodwork,
        Bloodwork.of({
          getVocabulary: () => Effect.succeed([]),
          saveReading: unused,
          deleteReading: unused,
          createVocabulary: () =>
            Effect.fail(
              new ConflictError({ resource: "vocabulary", id: "glucose" }),
            ),
          updateVocabulary: unused,
          deleteVocabulary: unused,
        }),
      ),
    );
    const { dispose: disposeConflict, handler: conflictHandler } =
      makeApiWebHandler(conflictServices);
    try {
      await expect(
        runClientWithHandler(conflictHandler, (client) =>
          client.vocabulary.create({
            payload: {
              key: "glucose",
              label: "Glucose",
              unit: "mg/dL",
              referenceRange: { min: 70, max: 100 },
              description: null,
              featured: true,
              visible: true,
            },
          }),
        ),
      ).rejects.toBeInstanceOf(ApiConflict);
    } finally {
      await disposeConflict();
    }

    const gatewayServices = Layer.merge(
      services,
      Layer.succeed(
        ProviderWorkflows,
        ProviderWorkflows.of({
          extract: unused,
          map: () =>
            Effect.fail(
              new ProviderRejected({ operation: "map", status: 429 }),
            ),
          research: unused,
        }),
      ),
    );
    const { dispose: disposeGateway, handler: gatewayHandler } =
      makeApiWebHandler(gatewayServices);
    try {
      await expect(
        runClientWithHandler(gatewayHandler, (client) =>
          client.import.map({ payload: { variables: [], vocabulary: [] } }),
        ),
      ).rejects.toBeInstanceOf(ApiBadGateway);
    } finally {
      await disposeGateway();
    }

    const unavailableServices = Layer.merge(
      services,
      Layer.succeed(
        Dashboard,
        Dashboard.of(
          makeDashboard(() =>
            Effect.fail(
              new PersistenceError({
                operation: "Dashboard.getData",
                cause: new Error("d1 unavailable"),
              }),
            ),
          ),
        ),
      ),
    );
    const { dispose: disposeUnavailable, handler: unavailableHandler } =
      makeApiWebHandler(unavailableServices);
    try {
      await expect(
        runClientWithHandler(unavailableHandler, (client) =>
          client.readings.export(),
        ),
      ).rejects.toBeInstanceOf(ApiServiceUnavailable);
    } finally {
      await disposeUnavailable();
    }
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
          validate: () => Effect.succeed(undefined),
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
        headers: {
          "content-type": "application/json",
          cookie: "bloodwork-session=test-session",
        },
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

  it("maps malformed multipart bodies to the declared bad request", async () => {
    const response = await handler(
      new Request("https://bloodwork.test/api/import/extract", {
        method: "POST",
        headers: {
          cookie: "bloodwork-session=test-session",
          "content-type": "multipart/form-data; boundary=broken",
        },
        body: "not-a-multipart-body",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      _tag: "Bloodwork.ApiBadRequest",
    });
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
    expect(document).toHaveProperty(
      "paths./api/dashboard/health.get.responses.400",
    );
    expect(document).toHaveProperty("paths./api/session.post.responses.400");
    expect(document).toHaveProperty("paths./api/readings.get.responses.401");
    expect(document).toHaveProperty("paths./api/readings.post.responses.400");
    expect(document).toHaveProperty(
      "paths./api/health/metrics/{metric}.patch.responses.400",
    );
    expect(document).toHaveProperty("paths./api/readings.get.security", [
      { session: [] },
    ]);
    expect(document).toHaveProperty("components.securitySchemes.session");
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
      urls.dashboard.trend({
        params: { key: makeBiomarkerKey("a/b") },
        query: { period: "1Y" },
      }),
    ).toBe("/api/biomarkers/a%2Fb/trend?period=1Y");
    expect(
      urls.vocabulary.delete({
        params: { key: makeVocabularyKey("glucose") },
        query: { expectedVersion: 7 },
      }),
    ).toBe("/api/vocabulary/glucose?expectedVersion=7");
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
      new Request("https://bloodwork.test/api/readings/export", {
        headers: { cookie: "bloodwork-session=test-session" },
      }),
      requestServices,
    );
    const second = await handleApiRequestWith(
      new Request("https://bloodwork.test/api/readings/export", {
        headers: { cookie: "bloodwork-session=test-session" },
      }),
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
