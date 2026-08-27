import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

const DEFAULT_PRODUCTION_URL = "https://bloodwork.mareknevole.com";

export const PRODUCTION_SMOKE_MAX_ATTEMPTS = 5;
export const PRODUCTION_SMOKE_REQUEST_TIMEOUT_MS = 10_000;
export const PRODUCTION_SMOKE_RETRY_DELAY_MS = 1_000;
export const PRODUCTION_SMOKE_MAX_RETRY_DELAY_MS = 4_000;

type SmokeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type SmokeFailure =
  | "invalid-json"
  | "missing-openapi-operation"
  | "missing-openapi-security"
  | "request-failed"
  | "unexpected-content-type"
  | "unexpected-status";

type SmokeCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SmokeFailure };

interface SmokeCheck {
  readonly name: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly validate: (
    response: Response,
  ) => SmokeCheckResult | Promise<SmokeCheckResult>;
}

export interface ProductionSmokeSummary {
  readonly name: string;
  readonly attempts: number;
}

export interface ProductionSmokeOptions {
  readonly baseUrl?: string;
  readonly fetch?: SmokeFetch;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly maxAttempts?: number;
  readonly requestTimeoutMs?: number;
  readonly retryDelayMs?: number;
}

export class ProductionSmokeError extends Error {
  readonly check: string;
  readonly attempts: number;
  readonly reason: SmokeFailure;

  constructor(check: string, attempts: number, reason: SmokeFailure) {
    super(
      `Production smoke check "${check}" failed after ${attempts} attempts (${reason}).`,
    );
    this.name = "ProductionSmokeError";
    this.check = check;
    this.attempts = attempts;
    this.reason = reason;
  }
}

/**
 * Normalize and constrain the smoke-test target to an origin. Keeping query,
 * fragment, and credentials out of the target prevents accidental secret
 * disclosure in requests and diagnostics.
 */
export const normalizeProductionUrl = (value: string): string => {
  const input = value.trim();
  if (!input) throw new Error("PRODUCTION_URL is required.");

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("PRODUCTION_URL must be a valid HTTPS origin.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("PRODUCTION_URL must be a valid HTTPS origin.");
  }

  return url.origin;
};

const OpenApiSecurityRequirement = Schema.Record(
  Schema.String,
  Schema.Array(Schema.String),
);
const OpenApiOperation = Schema.Struct({
  security: Schema.optional(Schema.Array(OpenApiSecurityRequirement)),
});
const OpenApiPathItem = Schema.Struct({
  get: Schema.optional(OpenApiOperation),
  post: Schema.optional(OpenApiOperation),
});
const OpenApiSecurityScheme = Schema.Struct({
  type: Schema.Literal("apiKey"),
  in: Schema.Literal("cookie"),
  name: Schema.Literal("bloodwork-session"),
});
const OpenApiDocument = Schema.Struct({
  paths: Schema.Record(Schema.String, OpenApiPathItem),
  components: Schema.Struct({
    securitySchemes: Schema.Record(Schema.String, OpenApiSecurityScheme),
  }),
});

type OpenApiDocument = typeof OpenApiDocument.Type;
type OpenApiOperation = typeof OpenApiOperation.Type;

const hasSessionSecurity = (value: OpenApiOperation["security"]): boolean =>
  value?.some(
    (entry) => entry.session !== undefined && entry.session.length === 0,
  ) ?? false;

const hasContentType = (response: Response, mediaType: string): boolean =>
  response.headers.get("content-type")?.toLowerCase().startsWith(mediaType) ??
  false;

const validateHtml = (response: Response): SmokeCheckResult => {
  if (response.status !== 200)
    return { ok: false, reason: "unexpected-status" };
  if (!hasContentType(response, "text/html")) {
    return { ok: false, reason: "unexpected-content-type" };
  }
  return { ok: true };
};

const validateJsonStatus = (
  expectedStatus: number,
  response: Response,
): SmokeCheckResult => {
  if (response.status !== expectedStatus) {
    return { ok: false, reason: "unexpected-status" };
  }
  if (!hasContentType(response, "application/json")) {
    return { ok: false, reason: "unexpected-content-type" };
  }
  return { ok: true };
};

const validateOpenApi = async (
  response: Response,
): Promise<SmokeCheckResult> => {
  if (response.status !== 200)
    return { ok: false, reason: "unexpected-status" };
  if (!hasContentType(response, "application/json")) {
    return { ok: false, reason: "unexpected-content-type" };
  }

  let document: OpenApiDocument;
  try {
    const decoded = Schema.decodeUnknownResult(OpenApiDocument)(
      await response.json(),
    );
    if (Result.isFailure(decoded)) {
      return { ok: false, reason: "invalid-json" };
    }
    document = decoded.success;
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const session = document.paths["/api/session"];
  const readings = document.paths["/api/readings"];
  if (session?.post === undefined || readings?.get === undefined) {
    return { ok: false, reason: "missing-openapi-operation" };
  }

  if (!hasSessionSecurity(readings.get.security)) {
    return { ok: false, reason: "missing-openapi-security" };
  }

  if (document.components.securitySchemes.session === undefined) {
    return { ok: false, reason: "missing-openapi-security" };
  }

  return { ok: true };
};

const releaseResponse = async (response: Response | undefined) => {
  const body = response?.body;
  if (body) await body.cancel().catch(() => undefined);
};

const fetchWithTimeout = async (
  fetcher: SmokeFetch,
  url: string,
  headers: Readonly<Record<string, string>>,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const request = Promise.resolve().then(() =>
    fetcher(url, {
      method: "GET",
      headers,
      redirect: "manual",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    }),
  );

  // A real fetch rejects when the signal is aborted. Keep the response body
  // bounded as well when a test/custom fetcher resolves after the timeout.
  void request.then(
    (response) => {
      if (timedOut) void releaseResponse(response);
    },
    () => undefined,
  );

  try {
    return await Promise.race([
      request,
      new Promise<Response>((_resolve, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error("Production smoke request timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
};

const retryDelay = (attempt: number, configuredDelayMs: number): number =>
  Math.min(
    configuredDelayMs * 2 ** (attempt - 1),
    PRODUCTION_SMOKE_MAX_RETRY_DELAY_MS,
  );

const runCheck = async (
  baseUrl: string,
  check: SmokeCheck,
  options: {
    readonly fetcher: SmokeFetch;
    readonly sleep: (milliseconds: number) => Promise<void>;
    readonly maxAttempts: number;
    readonly requestTimeoutMs: number;
    readonly retryDelayMs: number;
  },
): Promise<ProductionSmokeSummary> => {
  let lastReason: SmokeFailure = "request-failed";

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    let response: Response | undefined;
    try {
      response = await fetchWithTimeout(
        options.fetcher,
        `${baseUrl}${check.path}`,
        check.headers,
        options.requestTimeoutMs,
      );
      const result = await check.validate(response);
      if (result.ok) return { name: check.name, attempts: attempt };
      lastReason = result.reason;
    } catch {
      lastReason = "request-failed";
    } finally {
      await releaseResponse(response);
    }

    if (attempt < options.maxAttempts) {
      await options.sleep(retryDelay(attempt, options.retryDelayMs));
    }
  }

  throw new ProductionSmokeError(check.name, options.maxAttempts, lastReason);
};

const validateRetryOptions = (options: {
  readonly maxAttempts: number;
  readonly requestTimeoutMs: number;
  readonly retryDelayMs: number;
}) => {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer.");
  }
  if (
    !Number.isFinite(options.requestTimeoutMs) ||
    options.requestTimeoutMs < 1
  ) {
    throw new Error("requestTimeoutMs must be positive.");
  }
  if (!Number.isFinite(options.retryDelayMs) || options.retryDelayMs < 0) {
    throw new Error("retryDelayMs must be non-negative.");
  }
};

/**
 * Verify the public production surface using only bounded, credential-free
 * GET requests. The root render exercises live Worker bindings; OpenAPI
 * verifies the generated route/schema contract; the two protected reads prove
 * that session validation is active without changing application state.
 */
export const runProductionSmoke = async (
  options: ProductionSmokeOptions = {},
): Promise<readonly ProductionSmokeSummary[]> => {
  const baseUrl = normalizeProductionUrl(
    options.baseUrl ?? DEFAULT_PRODUCTION_URL,
  );
  const maxAttempts = options.maxAttempts ?? PRODUCTION_SMOKE_MAX_ATTEMPTS;
  const requestTimeoutMs =
    options.requestTimeoutMs ?? PRODUCTION_SMOKE_REQUEST_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? PRODUCTION_SMOKE_RETRY_DELAY_MS;
  validateRetryOptions({ maxAttempts, requestTimeoutMs, retryDelayMs });

  const fetcher = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const checks: readonly SmokeCheck[] = [
    {
      name: "public root",
      path: "/",
      headers: { accept: "text/html" },
      validate: validateHtml,
    },
    {
      name: "OpenAPI contract",
      path: "/api/openapi.json",
      headers: { accept: "application/json" },
      validate: validateOpenApi,
    },
    {
      name: "authentication without a session",
      path: "/api/readings",
      headers: { accept: "application/json" },
      validate: (response) => validateJsonStatus(401, response),
    },
    {
      name: "authentication rejects an invalid session",
      path: "/api/readings",
      headers: {
        accept: "application/json",
        cookie: "bloodwork-session=invalid",
      },
      validate: (response) => validateJsonStatus(401, response),
    },
  ];

  const summaries: ProductionSmokeSummary[] = [];
  for (const check of checks) {
    summaries.push(
      await runCheck(baseUrl, check, {
        fetcher,
        sleep,
        maxAttempts,
        requestTimeoutMs,
        retryDelayMs,
      }),
    );
  }
  return summaries;
};
