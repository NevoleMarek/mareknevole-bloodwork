import * as Schema from "effect/Schema";

/** A request crossed the HTTP boundary but did not match its wire schema. */
export class RequestDecodeError extends Schema.TaggedErrorClass<RequestDecodeError>()(
  "Bloodwork.RequestDecodeError",
  {
    operation: Schema.String,
    message: Schema.String,
  },
) {}

/** A required Cloudflare binding or secret was not available. */
export class ConfigurationError extends Schema.TaggedErrorClass<ConfigurationError>()(
  "Bloodwork.ConfigurationError",
  { key: Schema.String },
) {}

/** D1 or another persistence adapter failed. `cause` is retained for logs only. */
export class PersistenceError extends Schema.TaggedErrorClass<PersistenceError>()(
  "Bloodwork.PersistenceError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** A provider SDK or provider response failed outside an HTTP status response. */
export class ProviderError extends Schema.TaggedErrorClass<ProviderError>()(
  "Bloodwork.ProviderError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** Gemini (or another upstream) returned a non-success response. */
export class ProviderRejected extends Schema.TaggedErrorClass<ProviderRejected>()(
  "Bloodwork.ProviderRejected",
  {
    operation: Schema.String,
    status: Schema.Number,
  },
) {}

/** A provider returned JSON that did not satisfy the requested response schema. */
export class ProviderDecodeError extends Schema.TaggedErrorClass<ProviderDecodeError>()(
  "Bloodwork.ProviderDecodeError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** A requested persisted object does not exist. */
export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "Bloodwork.NotFoundError",
  {
    resource: Schema.String,
    id: Schema.String,
  },
) {}

/** A mutation conflicts with an existing persisted object. */
export class ConflictError extends Schema.TaggedErrorClass<ConflictError>()(
  "Bloodwork.ConflictError",
  {
    resource: Schema.String,
    id: Schema.String,
  },
) {}

/** A domain precondition was not met, such as an empty extraction. */
export class ValidationError extends Schema.TaggedErrorClass<ValidationError>()(
  "Bloodwork.ValidationError",
  {
    operation: Schema.String,
    message: Schema.String,
  },
) {}

/** Login credentials or a persisted session token were not accepted. */
export class AuthenticationError extends Schema.TaggedErrorClass<AuthenticationError>()(
  "Bloodwork.AuthenticationError",
  {
    reason: Schema.Literals([
      "invalid-password",
      "missing-password",
      "invalid-session",
    ]),
  },
) {}

export type ApplicationError =
  | RequestDecodeError
  | ConfigurationError
  | PersistenceError
  | ProviderError
  | ProviderRejected
  | ProviderDecodeError
  | NotFoundError
  | ConflictError
  | ValidationError
  | AuthenticationError;
