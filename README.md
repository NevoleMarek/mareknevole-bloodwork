# bloodwork.mareknevole.com

A public dashboard for tracking personal blood work over time. Better decisions come from better data — structured lab results, supplements, and health metrics, all in one place and open for anyone to learn from.

## Stack

- Next.js 16 compiled by OpenNext for Cloudflare Workers
- Alchemy v2 and Effect 4 own the production Worker, bindings, secrets, domain, and URL output
- Cloudflare D1 database
- Tailwind CSS 4
- Recharts
- Vitest + Testing Library

## SEO

The following SEO infrastructure is in place:

| File                       | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `app/layout.tsx`           | Open Graph, Twitter Card (`summary`), canonical URL, `robots` directives, meta description |
| `app/robots.ts`            | `robots.txt` — allows `/`, disallows `/admin` and `/api`                                   |
| `app/sitemap.ts`           | XML sitemap for `/` (weekly changeFrequency)                                               |
| `app/favicon.ico`          | Favicon                                                                                    |
| `app/layout.tsx` (JSON-LD) | `WebApplication` schema with author link back to mareknevole.com                           |

### Structured data

```json
{
  "@type": "WebApplication",
  "name": "Bloodwork",
  "applicationCategory": "HealthApplication",
  "url": "https://bloodwork.mareknevole.com",
  "author": {
    "@type": "Person",
    "name": "Marek Nevole",
    "url": "https://mareknevole.com"
  }
}
```

### Future improvements

- Dedicated OG image (1200x630) for richer social sharing previews
- `icon.svg` alongside existing `favicon.ico`
- Apple touch icon

## Development

```sh
bun install
bun run dev
```

## Application architecture

The API is declared once in the client-safe `lib/effect/api.ts` contract with
Effect v4's `effect/unstable/httpapi`. Its endpoint schemas drive request
decoding, response encoding, typed failures, OpenAPI at `/api/openapi.json`,
URL builders, and the generated browser client. Groups follow user goals and
resources (`dashboard`, `readings`, `vocabulary`, `supplements`, `changelog`,
`session`, `health`, and `import`) rather than database/provider adapters.
Handler groups invoke named Effect workflows and services; one optional Next
catch-all route adapts the resulting Fetch handler instead of maintaining a
route file per endpoint. `lib/effect/runtime.ts` remains the sole OpenNext
context adapter and supplies D1 and secret bindings to the live graph.
Configuration is read from a binding-backed `ConfigProvider`: `Config.redacted`
keeps the admin password and Gemini key as `Redacted` values until the trusted
Auth or Gemini adapter needs them.

The live graph is intentionally topological:

```text
CloudflareRuntime -> ApplicationConfig -> Gemini -> ProviderWorkflows
CloudflareRuntime -> Repository
Repository + DataCache -> Dashboard, Bloodwork, Health, Supplements
ApplicationConfig -> Auth
```

`Repository` is the D1 boundary and decodes persisted rows—including status
and aggregation enums—before mapping them to canonical domain schemas.
`Gemini` is the only SDK boundary; its layer acquires one redacted-key client
and the finite flash/pro model handles, while each request remains
interruptible. `DataCache` preserves Next/OpenNext `unstable_cache` and tag
invalidation semantics; it is not an in-memory cache substitute.
`lib/effect/api-server.ts` composes the contract, handler groups, platform
services, and application layer into the Fetch handler consumed by Next.
`lib/effect/client.ts` uses `HttpApiClient` so browser calls share the same URL,
payload, success, and error schemas. Server components cross their Effect
boundary through `lib/effect/run.ts`.

The beta.102 test package does not register a compatible `it.effect` Vitest
adapter, so Effect service tests use an explicit `Effect.runPromise` bridge in
the test files. Production `Effect.runPromise` is limited to server-component
and generated-client boundaries; the HttpApi runtime owns the Next Fetch
boundary.

Expected failures are tagged schema errors: malformed requests and validation
failures are `400`, missing resources are `404`, conflicts are `409`, provider
failures are `502`, and missing configuration or D1 failures are `503`. Defects
and interruption (including framework route-parameter failures) are not
converted into application responses.

Readings and public changelog use cursor pagination with a `nextCursor`; health
requests are bounded by the selected period, while biomarker trend requests use
one of the bounded `1M`, `6M`, or `1Y` windows (the chart currently requests
`1Y`, with no unbounded `ALL` trend). The vocabulary is a small
administrator-maintained dictionary and active supplements are bounded current
state, so they remain ordinary list resources. Full data export is a separate
explicit `/api/readings/export` operation because it is expensive and not needed
for the summaries view. API authentication is enforced by the shared HttpApi
cookie-security middleware with signed, expiring session tokens; Next middleware
only performs page redirects. This is a private, same-origin, single-user
frontend API: idempotency-key plumbing, automated retries, client rate-limit
metadata, and a per-client kill switch are intentionally omitted. Mutations are
not automatically retried, and the browser only retries explicit user actions;
adding those controls would add no meaningful protection for this deployment
while obscuring the resource contract.

## Verification

```sh
bun run check        # fast: format + lint + typecheck + test
bun run check:full   # fast suite + OpenNext Worker build + deployment contract
```

## Deploy

```sh
bun run build:worker
bun run verify:deployment
bun run plan:production
```

`wrangler.dev.jsonc` supports local Next and D1 development only. It is not a production deployment manifest.

The first production migration is intentionally manual. Review the plan, confirm that D1 name `bloodwork-db` has existing database ID `59c89aab-650f-4814-9182-dc6691e74237` and KV title `NEXT_INC_CACHE_KV` has existing namespace ID `3ce48886bf744930a9e9114f7c707019`, then run `bun alchemy deploy --stage prod --adopt`. The deployment environment needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_PASSWORD`, and `GEMINI_API_KEY`. Alchemy builds the Worker, seeds the build-scoped KV entries, initializes the D1 tag table, and publishes the Worker.

After adoption, pushes to `main` deploy through
`.github/workflows/deploy-production.yml`. Its GitHub `production` environment
supplies the same four values.
