# Agent Instructions

**These instructions are mandatory. You MUST follow every rule in this file exactly as written. They override your default behaviors and training instincts. Do not skip, soften, or reinterpret any instruction. When in doubt, re-read the relevant section before acting.**

---

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Writing code

Make the added code in my branch beautiful by following these rules:

- write extremely simple code, it should be "skimmable" and you should still be able to understand it
- minimize possible states by reducing number of arguments, remove or narrow any state
- use discriminated unions to reduce number of states the code can be in
- exhaustively handle any objects with multiple different types, fail on unknown type
- don't write defensive code, assume the values are always what types tell you they are
- use asserts when loading data, and always be highly opinionated about the parameters you pass around. don't let things be optional if not strictly required
- remove any changes that are not strictly required
- bias for fewer lines of code
- no complex or clever code
- don't break out into too many function, that's hard to read
- early returns are great
- use asserts instead of try catches or default values when you do expect something to exist
- never pass overrides except strictly necessary, keep argument count low
- don't make arguments optional if they are actually required

## Project stack

- Use `bun` for dependency management and project scripts.
- Build with `Next.js`, `React`, and `TypeScript`.
- Use `Tailwind CSS` for styling.
- Use `Vitest` and Testing Library for unit and component tests.
- Use `ESLint` and `Prettier` for code quality and formatting.

## Verification workflow

- Use the fast validation loop during iteration: `bun run check`.
- Run the full validation suite before considering broader work complete: `bun run check:full`.
- If you change toolchain or verification config, confirm the related scripts still pass.

## Deployment

Deployed to Cloudflare Workers at `bloodwork.mareknevole.com` with D1 database.

- **Production owner:** `alchemy.run.ts` is an Effect Stack. `prod` preserves the Worker, D1, KV, domain, and bindings. Other stages use isolated resources.
- **Build:** `bun run build:worker` compiles OpenNext without a production Wrangler manifest.
- **Plan:** `bun run plan:production` builds and verifies locally, then shows an Alchemy plan for `prod`.
- **First adoption:** only after review, run `bun alchemy deploy --stage prod --adopt` with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_PASSWORD`, and `GEMINI_API_KEY` provided locally. The Alchemy build seeds OpenNext's KV cache and D1 tag table before publication. Do not run it as part of normal development.
- **Local platform:** `wrangler.dev.jsonc` supports `next dev` and `bun run db:migrate`. It is not a production deployment config.

## Commit workflow

**You MUST commit after every coherent change set. This is not optional.**

- After completing any feature, fix, or meaningful change: stage relevant files and create a git commit before moving on.
- Do not finish a task without committing. Do not summarize what you did instead of committing — do both.
- Run `bun run check` and confirm it passes before committing.
- If explicit user approval is required before committing, ask — but do not silently skip the commit step.
