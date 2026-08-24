import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  type ApplicationError,
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

export class ApiBadRequest extends Schema.TaggedErrorClass<ApiBadRequest>()(
  "Bloodwork.ApiBadRequest",
  { error: Schema.String },
  { httpApiStatus: 400 },
) {}

export class ApiUnauthorized extends Schema.TaggedErrorClass<ApiUnauthorized>()(
  "Bloodwork.ApiUnauthorized",
  { error: Schema.String },
  { httpApiStatus: 401 },
) {}

export class ApiNotFound extends Schema.TaggedErrorClass<ApiNotFound>()(
  "Bloodwork.ApiNotFound",
  { error: Schema.String },
  { httpApiStatus: 404 },
) {}

export class ApiConflict extends Schema.TaggedErrorClass<ApiConflict>()(
  "Bloodwork.ApiConflict",
  { error: Schema.String },
  { httpApiStatus: 409 },
) {}

export class ApiBadGateway extends Schema.TaggedErrorClass<ApiBadGateway>()(
  "Bloodwork.ApiBadGateway",
  { error: Schema.String },
  { httpApiStatus: 502 },
) {}

export class ApiServiceUnavailable extends Schema.TaggedErrorClass<ApiServiceUnavailable>()(
  "Bloodwork.ApiServiceUnavailable",
  { error: Schema.String },
  { httpApiStatus: 503 },
) {}

export type ApiError =
  | ApiBadRequest
  | ApiUnauthorized
  | ApiNotFound
  | ApiConflict
  | ApiBadGateway
  | ApiServiceUnavailable;

export type ApiErrorFor<E extends ApplicationError> = E extends
  | RequestDecodeError
  | ValidationError
  ? ApiBadRequest
  : E extends AuthenticationError
    ? ApiUnauthorized
    : E extends NotFoundError
      ? ApiNotFound
      : E extends ConflictError
        ? ApiConflict
        : E extends ProviderRejected | ProviderError | ProviderDecodeError
          ? ApiBadGateway
          : E extends ConfigurationError | PersistenceError
            ? ApiServiceUnavailable
            : never;

export function toApiError<E extends ApplicationError>(
  error: E,
): ApiErrorFor<E>;
export function toApiError(error: ApplicationError): ApiError {
  if (error instanceof RequestDecodeError || error instanceof ValidationError) {
    return new ApiBadRequest({ error: error.message });
  }
  if (error instanceof AuthenticationError) {
    return new ApiUnauthorized({ error: "Invalid password" });
  }
  if (error instanceof NotFoundError) {
    return new ApiNotFound({
      error: error.resource === "biomarker" ? "Unknown biomarker" : "Not found",
    });
  }
  if (error instanceof ConflictError) {
    return new ApiConflict({ error: "Conflict" });
  }
  if (error instanceof ProviderRejected) {
    return new ApiBadGateway({
      error: "Upstream provider rejected the request",
    });
  }
  if (error instanceof ProviderError || error instanceof ProviderDecodeError) {
    return new ApiBadGateway({ error: "Upstream provider unavailable" });
  }
  if (
    error instanceof ConfigurationError ||
    error instanceof PersistenceError
  ) {
    return new ApiServiceUnavailable({ error: "Service unavailable" });
  }
  return error satisfies never;
}

export const withApiErrors = <A, E extends ApplicationError, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, ApiErrorFor<E>, R> =>
  effect.pipe(Effect.mapError(toApiError));

export const apiErrorMessage = (cause: unknown): string | undefined => {
  if (
    cause instanceof ApiBadRequest ||
    cause instanceof ApiUnauthorized ||
    cause instanceof ApiNotFound ||
    cause instanceof ApiConflict ||
    cause instanceof ApiBadGateway ||
    cause instanceof ApiServiceUnavailable
  ) {
    return cause.error;
  }
  return undefined;
};
