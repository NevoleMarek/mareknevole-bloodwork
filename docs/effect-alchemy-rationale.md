# Effect and Alchemy deployment rationale

## Usage

Build the same OpenNext Worker that runs today, then verify the local contract.

```sh
bun run build:worker
bun run verify:deployment
```

The stack lives in `alchemy.run.ts`. Production deploys use the explicit `prod` stage. The stack returns the custom-domain URL. Other stages omit production names and the production domain, so they receive isolated Alchemy resources.

```sh
bun run plan:production
```

Production deployment uses `bun alchemy deploy --stage prod --adopt` after confirming that D1 name `bloodwork-db` has existing database ID `59c89aab-650f-4814-9182-dc6691e74237`, KV title `NEXT_INC_CACHE_KV` has existing namespace ID `3ce48886bf744930a9e9114f7c707019`, and `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and both runtime secrets are supplied.

## Chosen shape

An Alchemy `Command.Build` runs the OpenNext compiler, then the cache seed. The build receives the resolved Cloudflare account, D1, and KV identifiers as environment values. The seed writes each `.open-next/cache` value under OpenNext's build-ID-scoped KV key and creates the `revalidations` table used by the D1 tag cache. It is idempotent.

A separate `Cloudflare.Worker` consumes the build output. `main` points at `.open-next/worker.js`, its asset directory points at `.open-next/assets`, and Alchemy bundles the Worker before upload. OpenNext's server artifact deliberately leaves Node built-ins such as `fs` and `path` as CommonJS `require()` calls for the deployment bundler to resolve. Both resources stay under the `BloodworkSite` namespace so their Alchemy identities match the original deployment graph.

The stack is an `Effect.gen` program. It yields one D1 resource and one KV resource. The D1 value appears under both `DB` and `NEXT_TAG_CACHE_D1`. The KV value appears only under `NEXT_INC_CACHE_KV`. `Config.redacted` produces the two Worker secret bindings. No second D1 or KV resource can drift from those bindings.

The login route now decodes its untrusted JSON body with Effect Schema. That keeps malformed input at the HTTP boundary and avoids a cast before the timing-safe password check.

`wrangler.dev.jsonc` remains only for `next dev` and local D1 work. OpenNext uses Wrangler's local platform proxy there. It is not a production manifest and no deployment command reads it.

## Rejected options

- A true static export cannot keep the D1 page, APIs, auth, Gemini flows, or cache adapters.
- Uploading `.open-next/worker.js` without bundling leaves OpenNext's external Node built-ins as runtime `require()` calls. Module Workers do not define that CommonJS global, so the deployment must retain Alchemy's bundling step.
- A custom Effect HTTP wrapper would add a second request path without helping the existing app. The stack and login boundary make Effect part of the deployed contract without a framework rewrite.
- `StaticSite` serializes non-string build environment values before the deferred command runs. That loses the live Alchemy outputs needed for the adopted D1 and KV IDs. Separate build and Worker resources keep those outputs intact and keep runtime-only secrets out of the build environment.

## Risks

Alchemy discovers the existing D1 by name and the KV namespace by title. Before an adoption, verify that D1 name `bloodwork-db` still maps to database ID `59c89aab-650f-4814-9182-dc6691e74237`, and that KV title `NEXT_INC_CACHE_KV` still maps to namespace ID `3ce48886bf744930a9e9114f7c707019`. The deployment token needs Workers KV Storage Write and D1 write access. Review the plan before adoption.
