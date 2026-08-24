import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  ApplicationError,
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  NotFoundError,
  PersistenceError,
  ProviderDecodeError,
  ProviderError,
  ProviderRejected,
  RequestDecodeError,
  ValidationError,
} from "@/lib/effect/errors";
import { appLayer } from "@/lib/effect/layers";

type SchemaConstraint = Schema.Top;

export const decodeJson = <S extends SchemaConstraint>(
  request: Request,
  schema: S,
  operation: string,
): Effect.Effect<S["Type"], RequestDecodeError, S["DecodingServices"]> =>
  Effect.tryPromise({
    try: () => request.json(),
    catch: () =>
      new RequestDecodeError({ operation, message: "Invalid JSON body" }),
  }).pipe(
    Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body)),
    Effect.mapError((error) =>
      error instanceof RequestDecodeError
        ? error
        : new RequestDecodeError({
            operation,
            message: "Invalid request body",
          }),
    ),
  );

export const decodeFormData = <S extends SchemaConstraint>(
  request: Request,
  schema: S,
  operation: string,
): Effect.Effect<S["Type"], RequestDecodeError, S["DecodingServices"]> =>
  Effect.tryPromise({
    try: () => request.formData(),
    catch: () =>
      new RequestDecodeError({ operation, message: "Invalid multipart body" }),
  }).pipe(
    Effect.flatMap((data) => Schema.decodeUnknownEffect(schema)(data)),
    Effect.mapError(
      () =>
        new RequestDecodeError({
          operation,
          message: "Invalid multipart body",
        }),
    ),
  );

export const provideAppLayer = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.provide(appLayer));

export const runAppEffect = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
  Effect.runPromise(effect);

export const runRouteValue = async <A, E>(
  effect: Effect.Effect<A, E>,
): Promise<
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly response: Response }
> => {
  try {
    return { _tag: "Success", value: await Effect.runPromise(effect) };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const response = responseForError(error);
    if (response) return { _tag: "Failure", response };
    throw error;
  }
};

export const responseForError = (error: Error): Response | undefined => {
  if (error instanceof RequestDecodeError || error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof AuthenticationError) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }
  if (error instanceof NotFoundError) {
    return Response.json(
      {
        error:
          error.resource === "biomarker" ? "Unknown biomarker" : "Not found",
      },
      { status: 404 },
    );
  }
  if (error instanceof ConflictError) {
    return Response.json({ error: "Conflict" }, { status: 409 });
  }
  if (error instanceof ProviderRejected) {
    return Response.json(
      { error: "Upstream provider rejected the request" },
      {
        status: 502,
      },
    );
  }
  if (error instanceof ProviderError || error instanceof ProviderDecodeError) {
    return Response.json(
      { error: "Upstream provider unavailable" },
      { status: 502 },
    );
  }
  if (
    error instanceof ConfigurationError ||
    error instanceof PersistenceError
  ) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
  return undefined;
};

export const runRoute = <A, E>(
  effect: Effect.Effect<A, E>,
  toResponse: (value: A) => Response = (value) => Response.json(value),
): Promise<Response> =>
  runAppEffect(effect)
    .then(toResponse)
    .catch((error) => {
      if (!(error instanceof Error)) throw error;
      const response = responseForError(error);
      if (response) return response;
      throw error;
    });

export type RouteError = ApplicationError;
