# bloodwork.mareknevole.com

Public dashboard for personal blood work, supplements, and health metrics, with password-protected administration.

## Run locally

Use Bun (CI uses 1.4.0). [Next.js development](next.config.ts) loads local Cloudflare bindings from [wrangler.dev.jsonc](wrangler.dev.jsonc); initialize its local D1 database before opening the dashboard.

```bash
bun install
bun run db:migrate # applies db/migrations to local D1 only
bun run dev # http://localhost:3000
```

The empty database is enough to start. To sign in at `/admin`, create a local `.dev.vars` file beside `wrangler.dev.jsonc` containing `ADMIN_PASSWORD=<your-local-password>`. Add `GEMINI_API_KEY=<your-key>` only for AI extraction, mapping, and research; those requests use the external Gemini service and may incur charges. Restart the dev server after changing bindings.

Keep `.dev.vars` out of Git: add `.dev.vars` to the local exclude file located by `git rev-parse --git-path info/exclude` before creating it. The repository does not currently ignore that filename. Ordinary `.env*` values are not forwarded into OpenNext's local Cloudflare bindings. See [runtime configuration](lib/effect/config.ts) for required values by operation.

The optional `db:seed` script only prints SQL from the existing JSON data; it does not apply it. Review [the generator](db/migrate.ts) before importing data. [Migrations](db/migrations) are the schema source; the local Wrangler config is not a production deployment manifest.

## Check changes

```bash
bun run check # read-only format check, lint, typecheck, and tests

# Optional release check: also builds the OpenNext Worker and verifies artifacts.
# bun run check:full
```

Checks run sequentially and stop at the first failure. [Deployment verification](scripts/verify-deployment.ts) checks the Worker, server handler, assets, and cache artifacts. See [package scripts](package.json) for individual checks and explicit formatting or lint fixes.

## Understand data access

Dashboard data is public, including health metrics, biomarker trends, and the changelog. These reads and `/api/openapi.json` are accessible to any network client. Visibility settings are publication decisions: keep sensitive information out of public dashboard fields and changelog entries.

Reading management/export, vocabulary, supplements, health administration, changelog writes, and AI import workflows require a valid `bloodwork-session` cookie. Login and logout are unauthenticated session endpoints. The [API contract](lib/effect/api.ts) defines exact routes, schemas, and authentication requirements; [API handlers](lib/effect/api-server.ts) enforce them.

There is one administrator password and no per-user roles. [Authentication](lib/effect/services.ts) validates signed HMAC tokens with a seven-day expiry. Cookies are HttpOnly, SameSite=Strict, and Secure outside development. [Next middleware](middleware.ts) checks cookie presence for admin navigation; API middleware validates the session itself. Same-origin browser requests are a convention, not an access restriction.

The app provides no API rate limiting, origin allowlist, or client-specific revocation. Add edge controls if needed. Mutations have no idempotency keys or automatic retries; concurrent edits can return `409 Conflict` and require reloading before retrying.

## Deploy

[Alchemy](alchemy.run.ts) owns the OpenNext Worker, D1 migrations, cache bindings, secrets, and production domain. Supply `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `ADMIN_PASSWORD`, and `GEMINI_API_KEY` in the deployment environment.

```bash
# Requires Cloudflare credentials: builds and verifies artifacts, then plans prod.
# bun run plan:production

# First production migration only: review the plan and resource identities below.
# bun alchemy deploy --stage prod --adopt

# Later releases: runs the full check and publishes to production.
# bun run deploy:production
```

Before the first adoption, confirm ownership of Worker `bloodwork` and domain `bloodwork.mareknevole.com`, plus the existing resources:

| Resource               | Existing identity                      |
| ---------------------- | -------------------------------------- |
| D1 `bloodwork-db`      | `59c89aab-650f-4814-9182-dc6691e74237` |
| KV `NEXT_INC_CACHE_KV` | `3ce48886bf744930a9e9114f7c707019`     |

The [production build](scripts/build-production-opennext.ts) prepares the Worker and remote cache before publication. Unlike `deploy:production`, `plan:production` does not run the source check suite. Confirm adoption has completed before enabling automated releases: the [production workflow](.github/workflows/deploy-production.yml) checks and deploys pushes to `main`, with the account ID variable and three secrets from GitHub's `production` environment.
