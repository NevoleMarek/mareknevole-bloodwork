import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import {
  ApiSessionMiddleware,
  BloodworkApi,
  sessionSecurity,
} from "@/lib/effect/api";
import { withApiErrors } from "@/lib/effect/api-errors";
import { RequestDecodeError } from "@/lib/effect/errors";
import { appLayer } from "@/lib/effect/layers";
import { changelogCursor, readingCursor } from "@/lib/effect/query";
import {
  Auth,
  Bloodwork,
  Dashboard,
  Health,
  ProviderWorkflows,
  Supplements,
} from "@/lib/effect/services";
import {
  changelogEffect,
  dataEffect,
  getReadingsEffect,
  healthEffect,
  saveReadingEffect,
  trendEffect,
} from "@/lib/effect/workflows";

const SESSION_COOKIE = sessionSecurity.key;

const apiSessionMiddlewareLayer = Layer.effect(
  ApiSessionMiddleware,
  Effect.gen(function* () {
    const auth = yield* Auth;
    return {
      session: (httpEffect, { credential }) =>
        Effect.gen(function* () {
          yield* auth.validate(Redacted.value(credential)).pipe(withApiErrors);
          return yield* httpEffect;
        }),
    };
  }),
);

const dashboardHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "dashboard",
  (handlers) =>
    Effect.gen(function* () {
      const dashboard = yield* Dashboard;
      return handlers
        .handle(
          "health",
          Effect.fn("HttpApi.dashboard.health")(function* ({ query }) {
            return yield* healthEffect(query.period).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "trend",
          Effect.fn("HttpApi.dashboard.trend")(function* ({ params, query }) {
            return yield* trendEffect(params.key, query.period).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        );
    }),
);

const changelogHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "changelog",
  (handlers) =>
    Effect.gen(function* () {
      const dashboard = yield* Dashboard;
      const supplements = yield* Supplements;
      return handlers
        .handle(
          "list",
          Effect.fn("HttpApi.changelog.list")(function* ({ query }) {
            const cursor = yield* changelogCursor(query).pipe(withApiErrors);
            return yield* changelogEffect(cursor).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "update",
          Effect.fn("HttpApi.changelog.update")(function* ({
            params,
            payload,
          }) {
            yield* supplements
              .updateChangelog(params.id, payload.description)
              .pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "delete",
          Effect.fn("HttpApi.changelog.delete")(function* ({ params }) {
            yield* supplements.deleteChangelog(params.id).pipe(withApiErrors);
            return undefined;
          }),
        );
    }),
);

const sessionHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "session",
  (handlers) =>
    Effect.gen(function* () {
      const auth = yield* Auth;
      return handlers
        .handle(
          "create",
          Effect.fn("HttpApi.session.create")(function* ({ payload }) {
            const session = yield* auth
              .authenticate(payload.password)
              .pipe(withApiErrors);
            yield* HttpApiBuilder.securitySetCookie(
              sessionSecurity,
              session.token,
              {
                httpOnly: true,
                secure: session.secure,
                sameSite: "strict",
                maxAge: Duration.days(7),
                path: "/",
              },
            );
            return { authenticated: true };
          }),
        )
        .handle(
          "delete",
          Effect.fn("HttpApi.session.delete")(function* () {
            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
              // The cookie name and path are server-owned constants.
              Effect.sync(() =>
                HttpServerResponse.expireCookieUnsafe(
                  response,
                  SESSION_COOKIE,
                  {
                    path: "/",
                  },
                ),
              ),
            );
            return undefined;
          }),
        );
    }),
);

const readingsHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "readings",
  (handlers) =>
    Effect.gen(function* () {
      const dashboard = yield* Dashboard;
      const bloodwork = yield* Bloodwork;
      return handlers
        .handle(
          "list",
          Effect.fn("HttpApi.readings.list")(function* ({ query }) {
            const cursor = yield* readingCursor(query).pipe(withApiErrors);
            return yield* getReadingsEffect(cursor).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "export",
          Effect.fn("HttpApi.readings.export")(function* () {
            return yield* dataEffect().pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "create",
          Effect.fn("HttpApi.readings.create")(function* ({ payload }) {
            return yield* saveReadingEffect(payload).pipe(
              Effect.provideService(Bloodwork, bloodwork),
              withApiErrors,
            );
          }),
        )
        .handle(
          "delete",
          Effect.fn("HttpApi.readings.delete")(function* ({ params }) {
            yield* bloodwork.deleteReading(params.id).pipe(withApiErrors);
            return undefined;
          }),
        );
    }),
);

const vocabularyHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "vocabulary",
  (handlers) =>
    Effect.gen(function* () {
      const bloodwork = yield* Bloodwork;
      return handlers
        .handle(
          "list",
          Effect.fn("HttpApi.vocabulary.list")(function* () {
            return {
              entries: yield* bloodwork.getVocabulary().pipe(withApiErrors),
            };
          }),
        )
        .handle(
          "create",
          Effect.fn("HttpApi.vocabulary.create")(function* ({ payload }) {
            yield* bloodwork.createVocabulary(payload).pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "update",
          Effect.fn("HttpApi.vocabulary.update")(function* ({
            params,
            payload,
          }) {
            yield* bloodwork
              .updateVocabulary({ ...payload, key: params.key })
              .pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "delete",
          Effect.fn("HttpApi.vocabulary.delete")(function* ({ params }) {
            yield* bloodwork.deleteVocabulary(params.key).pipe(withApiErrors);
            return undefined;
          }),
        );
    }),
);

const supplementsHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "supplements",
  (handlers) =>
    Effect.gen(function* () {
      const supplements = yield* Supplements;
      return handlers
        .handle(
          "list",
          Effect.fn("HttpApi.supplements.list")(function* () {
            return {
              supplements: yield* supplements.get().pipe(withApiErrors),
            };
          }),
        )
        .handle(
          "create",
          Effect.fn("HttpApi.supplements.create")(function* ({ payload }) {
            yield* supplements.create(payload).pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "update",
          Effect.fn("HttpApi.supplements.update")(function* ({
            params,
            payload,
          }) {
            yield* supplements
              .update({ ...payload, id: params.id })
              .pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "delete",
          Effect.fn("HttpApi.supplements.delete")(function* ({
            params,
            query,
          }) {
            yield* supplements
              .remove({ ...query, id: params.id })
              .pipe(withApiErrors);
            return undefined;
          }),
        );
    }),
);

const healthHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "health",
  (handlers) =>
    Effect.gen(function* () {
      const health = yield* Health;
      return handlers
        .handle(
          "configs",
          Effect.fn("HttpApi.health.configs")(function* () {
            return yield* health.getConfigs().pipe(withApiErrors);
          }),
        )
        .handle(
          "updateVisibility",
          Effect.fn("HttpApi.health.updateVisibility")(function* ({
            params,
            payload,
          }) {
            yield* health
              .updateVisibility({ ...payload, metric: params.metric })
              .pipe(withApiErrors);
            return undefined;
          }),
        )
        .handle(
          "import",
          Effect.fn("HttpApi.health.import")(function* ({ payload }) {
            return yield* health.import(payload).pipe(withApiErrors);
          }),
        );
    }),
);

interface MultipartSource {
  readonly formData: () => Promise<FormData>;
}

const MultipartSource = Schema.declare<MultipartSource>(
  (value): value is MultipartSource =>
    Predicate.hasProperty(value, "formData") &&
    Predicate.isFunction(value.formData),
  { identifier: "MultipartSource" },
);

const PdfFile = Schema.declare<File>(
  (value): value is File =>
    Predicate.hasProperty(value, "name") &&
    Predicate.isString(value.name) &&
    Predicate.hasProperty(value, "arrayBuffer") &&
    Predicate.isFunction(value.arrayBuffer),
  { identifier: "PdfFile" },
);

const readPdf = Effect.fn("HttpApi.import.readPdf")(function* (
  source: HttpServerRequest.HttpServerRequest["source"],
) {
  const multipartSource = yield* Schema.decodeUnknownEffect(MultipartSource)(
    source,
  ).pipe(
    Effect.mapError(
      () =>
        new RequestDecodeError({
          operation: "extract.request",
          message: "Unsupported request source",
        }),
    ),
  );
  const formData = yield* Effect.tryPromise({
    try: () => multipartSource.formData(),
    catch: () =>
      new RequestDecodeError({
        operation: "extract.form",
        message: "Invalid multipart body",
      }),
  });
  return yield* Schema.decodeUnknownEffect(PdfFile)(formData.get("pdf")).pipe(
    Effect.mapError(
      () =>
        new RequestDecodeError({
          operation: "extract.pdf",
          message: "No PDF file provided",
        }),
    ),
  );
});

const importHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "import",
  (handlers) =>
    Effect.gen(function* () {
      const workflows = yield* ProviderWorkflows;
      return handlers
        .handleRaw(
          "extract",
          Effect.fn("HttpApi.import.extract")(function* ({ request }) {
            const file = yield* readPdf(request.source).pipe(withApiErrors);
            return yield* workflows.extract(file).pipe(withApiErrors);
          }),
        )
        .handle(
          "map",
          Effect.fn("HttpApi.import.map")(function* ({ payload }) {
            return yield* workflows.map(payload).pipe(withApiErrors);
          }),
        )
        .handle(
          "research",
          Effect.fn("HttpApi.import.research")(function* ({ payload }) {
            return yield* workflows.research(payload).pipe(withApiErrors);
          }),
        );
    }),
);

/** Dependency-free handler definitions; production provisioning is below. */
export const handlerDefinitions = Layer.mergeAll(
  dashboardHandlers,
  changelogHandlers,
  sessionHandlers,
  readingsHandlers,
  vocabularyHandlers,
  supplementsHandlers,
  healthHandlers,
  importHandlers,
);

export type ApiServices =
  | Auth
  | Bloodwork
  | Dashboard
  | Health
  | ProviderWorkflows
  | Supplements;

export const makeApiLayer = <E>(services: Layer.Layer<ApiServices, E>) =>
  HttpApiBuilder.layer(BloodworkApi, {
    openapiPath: "/api/openapi.json",
  }).pipe(
    Layer.provide(
      handlerDefinitions.pipe(
        Layer.provide(
          Layer.merge(
            services,
            apiSessionMiddlewareLayer.pipe(Layer.provide(services)),
          ),
        ),
      ),
    ),
    Layer.provide(HttpServer.layerServices),
  );

export const makeApiWebHandler = <E>(services: Layer.Layer<ApiServices, E>) =>
  HttpRouter.toWebHandler(makeApiLayer(services), { disableLogger: true });

export const handleApiRequestWith = async <E>(
  request: Request,
  services: Layer.Layer<ApiServices, E>,
): Promise<Response> => {
  const { dispose, handler } = makeApiWebHandler(services);
  try {
    return await handler(request);
  } finally {
    await dispose();
  }
};

/** Keep OpenNext bindings request-scoped instead of caching the first ALS store. */
export const handleApiRequest = (request: Request): Promise<Response> =>
  handleApiRequestWith(request, appLayer);
