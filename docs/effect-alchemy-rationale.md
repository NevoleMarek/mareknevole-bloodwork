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

The first production deployment is a separate approved operation. It must use `bun alchemy deploy --stage prod --adopt` after the reviewer confirms that D1 name `bloodwork-db` has existing database ID `59c89aab-650f-4814-9182-dc6691e74237`, KV title `NEXT_INC_CACHE_KV` has existing namespace ID `3ce48886bf744930a9e9114f7c707019`, and both runtime secrets are supplied. This migration does not run that command.

## Chosen shape

`Cloudflare.Website.StaticSite` runs the unchanged OpenNext compiler. Its `main` points at `.open-next/worker.js`, `outdir` points at `.open-next/assets`, and `bundle: false` preserves OpenNext's module graph. The resource name is a convenience. Bloodwork remains a dynamic Next Worker with D1-backed pages, route handlers, auth, and Gemini calls.

The stack is an `Effect.gen` program. It yields one D1 resource and one KV resource. The D1 value appears under both `DB` and `NEXT_TAG_CACHE_D1`. The KV value appears only under `NEXT_INC_CACHE_KV`. `Config.redacted` produces the two Worker secret bindings. No second D1 or KV resource can drift from those bindings.

The login route now decodes its untrusted JSON body with Effect Schema. That keeps malformed input at the HTTP boundary and avoids a cast before the timing-safe password check.

`wrangler.dev.jsonc` remains only for `next dev` and local D1 work. OpenNext uses Wrangler's local platform proxy there. It is not a production manifest and no deployment command reads it.

## Rejected options

- A true static export cannot keep the D1 page, APIs, auth, Gemini flows, or cache adapters.
- Rebundling `.open-next/worker.js` risks breaking its dynamic imports. Alchemy documents `bundle: false` for this case.
- A custom Effect HTTP wrapper would add a second request path without helping the existing app. The stack and login boundary make Effect part of the deployed contract without a framework rewrite.
- A direct Worker plus a separate build resource works, but `StaticSite` already owns the build command and asset directory.

## Risks

Alchemy discovers the existing D1 by name and the KV namespace by title. Before the approved adoption, verify that D1 name `bloodwork-db` still maps to database ID `59c89aab-650f-4814-9182-dc6691e74237`, and that KV title `NEXT_INC_CACHE_KV` still maps to namespace ID `3ce48886bf744930a9e9114f7c707019`. Review the plan before adoption. Cloud behavior remains not verified until that deployment occurs.
