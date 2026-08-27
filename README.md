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

## Production verification and recovery

Every production deploy runs `bun run smoke:production` after Alchemy reports a
successful publish. The probe sends only bounded, credential-free `GET`
requests to the public root, `/api/openapi.json`, and the protected
`/api/readings` endpoint (without a cookie and with a deliberately invalid
cookie). It checks the HTML root, the generated OpenAPI operations and session
security metadata, and `401` responses from the authentication boundary. It
does not log response bodies, cookies, headers, or deployment secrets. Requests
have a timeout and at most five attempts with capped exponential backoff; a
failed probe fails the workflow.

### Worker rollback

If the smoke test fails, pause subsequent production deploys and inspect the
failed check and Worker logs. A rollback is an operator action, not an automatic
workflow step:

1. Identify a known-good version in the Cloudflare dashboard under **Workers &
   Pages → bloodwork → Deployments**, or list recent versions with
   `bunx wrangler versions list --name bloodwork`.
2. Confirm that the target version is compatible with the current D1 schema and
   still points at the adopted `bloodwork-db` and `NEXT_INC_CACHE_KV` resources.
   Cloudflare only exposes the 100 most recently published versions for
   rollback, and a rollback does not restore or change connected resources.
3. Roll back the Worker version, recording the incident reason:

   ```sh
   bunx wrangler rollback <known-good-version-id> --name bloodwork \
     --message "rollback after production smoke failure"
   ```

   Authenticate Wrangler with the production-scoped `CLOUDFLARE_ACCOUNT_ID`
   and `CLOUDFLARE_API_TOKEN` in the operator environment; never put token
   values in this command, a workflow log, or a commit.

4. Rerun the read-only probe and inspect the public root, OpenAPI, and auth
   results before resuming deploys:

   ```sh
   PRODUCTION_URL=https://bloodwork.mareknevole.com bun run smoke:production
   ```

   If Cloudflare rejects the rollback because a connected resource changed or
   was deleted, do not repeatedly force the old Worker. Ship a forward fix that
   understands the current bindings and schema instead. A Worker rollback
   changes the active code deployment; it is not a database rollback.

### D1 recovery

D1 migrations are forward-only in this repository. Alchemy owns the adopted
production D1 resource and applies the ordered files in `db/migrations` during
deployment. Never edit or remove an applied migration, reuse its number, or
expect a Worker rollback to undo SQL. For a schema or compatibility defect:

1. Keep the Worker and schema compatible while the incident is contained. If
   the old Worker cannot run against the current schema, deploy a compatible
   Worker first.
2. Add the next numbered migration under `db/migrations/` (for example,
   `0003_restore_compatibility.sql`) that safely repairs the schema or data.
   Review it locally, run `bun run plan:production`, and deploy it through the
   normal reviewed Alchemy path. Confirm the migration and smoke results before
   resuming ordinary changes.
3. For accidental data changes or a migration that cannot be repaired forward,
   stop writes and obtain explicit operator approval before using D1 Time
   Travel. Confirm that `bloodwork-db` is a production-backend D1 database
   before relying on Time Travel, then capture the current bookmark and the
   incident timestamp:

   ```sh
   bunx wrangler d1 info bloodwork-db
   bunx wrangler d1 time-travel info bloodwork-db
   bunx wrangler d1 time-travel info bloodwork-db \
     --timestamp="<RFC3339-timestamp>"
   ```

   Then, only after checking the target point and blast radius, restore the
   remote database:

   ```sh
   bunx wrangler d1 time-travel restore bloodwork-db --bookmark=<bookmark>
   ```

   This is a destructive in-place overwrite that cancels in-flight queries;
   retain the returned previous bookmark so the restore can be undone if
   required. Retention is plan-dependent: up to 30 days on Workers Paid and up
   to 7 days on Workers Free. A restore is separate from the repository's
   migration workflow, so verify the restored schema and migration records,
   then deploy a forward-compatible Worker after recovery.

See Cloudflare's [Worker rollback guidance](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/),
[D1 migration guidance](https://developers.cloudflare.com/d1/reference/migrations/),
and [D1 Time Travel guidance](https://developers.cloudflare.com/d1/reference/time-travel/)
for platform limits and confirmation prompts.
