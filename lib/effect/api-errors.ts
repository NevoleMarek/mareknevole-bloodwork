import * as Effect from "effect/Effect";

import {
  ApiBadGateway,
  ApiBadRequest,
  ApiConflict,
  ApiNotFound,
  ApiServiceUnavailable,
  ApiUnauthorized,
  apiErrorMessage,
} from "@/lib/effect/api";
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

export {
  ApiBadGateway,
  ApiBadRequest,
  ApiConflict,
  ApiNotFound,
  ApiServiceUnavailable,
  ApiUnauthorized,
  apiErrorMessage,
};

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
    return new ApiUnauthorized({
      error:
        error.reason === "invalid-session"
          ? "Invalid session"
          : "Invalid password",
    });
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
