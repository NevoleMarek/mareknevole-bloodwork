import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpApiBuilder, HttpApiSecurity } from "effect/unstable/httpapi";
import * as HttpEffect from "effect/unstable/http/HttpEffect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { BloodworkApi } from "@/lib/effect/api";
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
  deleteChangelogEffect,
  deleteReadingEffect,
  getReadingsEffect,
  healthEffect,
  saveReadingEffect,
  trendEffect,
  updateChangelogEffect,
} from "@/lib/effect/workflows";
import { OkResponse } from "@/lib/schemas/wire";

const SESSION_COOKIE = "bloodwork-session";
const sessionSecurity = HttpApiSecurity.apiKey({
  key: SESSION_COOKIE,
  in: "cookie",
});
const ok = OkResponse.make({ ok: true });

const publicHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "public",
  (handlers) =>
    Effect.gen(function* () {
      const dashboard = yield* Dashboard;
      return handlers
        .handle(
          "changelog",
          Effect.fn("HttpApi.public.changelog")(function* ({ query }) {
            const cursor = yield* changelogCursor(query).pipe(withApiErrors);
            return yield* changelogEffect(cursor).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "health",
          Effect.fn("HttpApi.public.health")(function* ({ query }) {
            return yield* healthEffect(query.period).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        )
        .handle(
          "trend",
          Effect.fn("HttpApi.public.trend")(function* ({ params }) {
            return yield* trendEffect(params.key).pipe(
              Effect.provideService(Dashboard, dashboard),
              withApiErrors,
            );
          }),
        );
    }),
);

const authHandlers = HttpApiBuilder.group(BloodworkApi, "auth", (handlers) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    return handlers
      .handle(
        "login",
        Effect.fn("HttpApi.auth.login")(function* ({ payload }) {
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
          return ok;
        }),
      )
      .handle(
        "logout",
        Effect.fn("HttpApi.auth.logout")(function* () {
          yield* HttpEffect.appendPreResponseHandler((_request, response) =>
            // The cookie name and path are server-owned constants.
            Effect.sync(() =>
              HttpServerResponse.expireCookieUnsafe(response, SESSION_COOKIE, {
                path: "/",
              }),
            ),
          );
          return ok;
        }),
      );
  }),
);

const dataHandlers = HttpApiBuilder.group(BloodworkApi, "data", (handlers) =>
  Effect.gen(function* () {
    const dashboard = yield* Dashboard;
    const bloodwork = yield* Bloodwork;
    return handlers
      .handle(
        "exportData",
        Effect.fn("HttpApi.data.export")(function* () {
          return yield* dataEffect().pipe(
            Effect.provideService(Dashboard, dashboard),
            withApiErrors,
          );
        }),
      )
      .handle(
        "readings",
        Effect.fn("HttpApi.data.readings")(function* ({ query }) {
          const cursor = yield* readingCursor(query).pipe(withApiErrors);
          return yield* getReadingsEffect(cursor).pipe(
            Effect.provideService(Dashboard, dashboard),
            withApiErrors,
          );
        }),
      )
      .handle(
        "saveReading",
        Effect.fn("HttpApi.data.saveReading")(function* ({ payload }) {
          return yield* saveReadingEffect(payload).pipe(
            Effect.provideService(Bloodwork, bloodwork),
            withApiErrors,
          );
        }),
      )
      .handle(
        "deleteReading",
        Effect.fn("HttpApi.data.deleteReading")(function* ({ payload }) {
          return yield* deleteReadingEffect(payload.id).pipe(
            Effect.provideService(Bloodwork, bloodwork),
            withApiErrors,
          );
        }),
      )
      .handle(
        "vocabulary",
        Effect.fn("HttpApi.data.vocabulary")(function* () {
          return {
            entries: yield* bloodwork.getVocabulary().pipe(withApiErrors),
          };
        }),
      )
      .handle(
        "createVocabulary",
        Effect.fn("HttpApi.data.createVocabulary")(function* ({ payload }) {
          yield* bloodwork.createVocabulary(payload.entry).pipe(withApiErrors);
          return ok;
        }),
      )
      .handle(
        "updateVocabulary",
        Effect.fn("HttpApi.data.updateVocabulary")(function* ({ payload }) {
          yield* bloodwork.updateVocabulary(payload.entry).pipe(withApiErrors);
          return ok;
        }),
      )
      .handle(
        "deleteVocabulary",
        Effect.fn("HttpApi.data.deleteVocabulary")(function* ({ payload }) {
          yield* bloodwork.deleteVocabulary(payload.key).pipe(withApiErrors);
          return ok;
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
            return yield* supplements.get().pipe(withApiErrors);
          }),
        )
        .handle(
          "create",
          Effect.fn("HttpApi.supplements.create")(function* ({ payload }) {
            yield* supplements.create(payload).pipe(withApiErrors);
            return ok;
          }),
        )
        .handle(
          "update",
          Effect.fn("HttpApi.supplements.update")(function* ({ payload }) {
            yield* supplements.update(payload).pipe(withApiErrors);
            return ok;
          }),
        )
        .handle(
          "remove",
          Effect.fn("HttpApi.supplements.remove")(function* ({ payload }) {
            yield* supplements.remove(payload).pipe(withApiErrors);
            return ok;
          }),
        )
        .handle(
          "updateChangelog",
          Effect.fn("HttpApi.supplements.updateChangelog")(function* ({
            payload,
          }) {
            return yield* updateChangelogEffect(payload).pipe(
              Effect.provideService(Supplements, supplements),
              withApiErrors,
            );
          }),
        )
        .handle(
          "deleteChangelog",
          Effect.fn("HttpApi.supplements.deleteChangelog")(function* ({
            payload,
          }) {
            return yield* deleteChangelogEffect(payload.id).pipe(
              Effect.provideService(Supplements, supplements),
              withApiErrors,
            );
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
          Effect.fn("HttpApi.health.updateVisibility")(function* ({ payload }) {
            yield* health.updateVisibility(payload).pipe(withApiErrors);
            return ok;
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

const readPdf = Effect.fn("HttpApi.provider.readPdf")(function* (
  source: HttpServerRequest.HttpServerRequest["source"],
) {
  if (!(source instanceof Request)) {
    return yield* Effect.fail(
      new RequestDecodeError({
        operation: "extract.request",
        message: "Unsupported request source",
      }),
    );
  }
  const formData = yield* Effect.tryPromise({
    try: () => source.formData(),
    catch: () =>
      new RequestDecodeError({
        operation: "extract.form",
        message: "Invalid multipart body",
      }),
  });
  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    return yield* Effect.fail(
      new RequestDecodeError({
        operation: "extract.pdf",
        message: "No PDF file provided",
      }),
    );
  }
  return file;
});

const providerHandlers = HttpApiBuilder.group(
  BloodworkApi,
  "provider",
  (handlers) =>
    Effect.gen(function* () {
      const workflows = yield* ProviderWorkflows;
      return handlers
        .handleRaw(
          "extract",
          Effect.fn("HttpApi.provider.extract")(function* ({ request }) {
            const file = yield* readPdf(request.source).pipe(withApiErrors);
            return yield* workflows.extract(file).pipe(withApiErrors);
          }),
        )
        .handle(
          "map",
          Effect.fn("HttpApi.provider.map")(function* ({ payload }) {
            return yield* workflows.map(payload).pipe(withApiErrors);
          }),
        )
        .handle(
          "research",
          Effect.fn("HttpApi.provider.research")(function* ({ payload }) {
            return yield* workflows.research(payload).pipe(withApiErrors);
          }),
        );
    }),
);

const handlerDefinitions = Layer.mergeAll(
  publicHandlers,
  authHandlers,
  dataHandlers,
  supplementsHandlers,
  healthHandlers,
  providerHandlers,
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
    Layer.provide(handlerDefinitions.pipe(Layer.provide(services))),
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
