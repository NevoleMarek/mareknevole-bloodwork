# Architecture

## Current Stack

- Framework: `Next.js` App Router
- UI: `React` with `TypeScript`
- Package manager: `bun`
- Styling: `Tailwind CSS`
- Testing: `Vitest`, `jsdom`, and Testing Library
- Code quality: `ESLint` and `Prettier`
- AI: `@google-cloud/vertexai` — Gemini 2.5 Flash via Vertex AI
- Deployment: Cloudflare Pages with `@opennextjs/cloudflare` adapter

## Route Structure

| Route                | Access | Purpose                         |
| -------------------- | ------ | ------------------------------- |
| `/`                  | Public | Dashboard with metrics & trends |
| `/admin`             | Auth   | Login page                      |
| `/admin/data`        | Auth   | Readings management             |
| `/admin/vocabulary`  | Auth   | Vocabulary editor               |
| `/admin/supplements` | Auth   | Supplement stack editor         |

## Auth

Password-based authentication via middleware + session cookie. Middleware protects all `/admin/*` routes except the login page itself.

## API Routes

| Method | Route              | Purpose                            |
| ------ | ------------------ | ---------------------------------- |
| GET    | `/api/data`        | Return vocabulary and all readings |
| POST   | `/api/extract`     | PDF upload → Gemini extraction     |
| POST   | `/api/auth`        | Login, returns session cookie      |
| GET    | `/api/vocabulary`  | Return vocabulary                  |
| PUT    | `/api/vocabulary`  | Update vocabulary entries          |
| GET    | `/api/supplements` | Return supplement stack            |
| PUT    | `/api/supplements` | Update supplement stack            |

## Component Architecture

- `components/dashboard/` — public dashboard components
  - `metric-card` — single metric with value, unit, status, and range bar
  - `range-bar` — bounded zone visualization with value marker
  - `trend-chart` — sparkline trends over time
  - `supplement-stack` — current supplement list with dosages
- `components/admin/` — admin data management
  - `pdf-uploader` — PDF upload with extraction trigger
  - `readings-table` — tabular view of all readings
  - `vocabulary-editor` — edit test names, units, and ranges
  - `supplement-editor` — edit supplements with changelog
- `components/ui/` — shared primitives
  - `accordion` — collapsible section

## Data

Currently JSON files in `data/`. D1 SQLite migration pending.

- `data/vocabulary.json` — known test names, units, and reference ranges
- `data/readings.json` — all ingested bloodwork readings
- `data/supplements.json` — current supplement stack

Target D1 tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`.

## Project Structure

- `app/` — Next.js routes, layout, and global styles
- `components/` — reusable UI components (dashboard, admin, ui)
- `data/` — JSON data files
- `types/bloodwork.ts` — shared TypeScript types
- `prompts/` — Gemini prompt templates
- `specs/` — living product and architecture documentation
- `middleware.ts` — auth middleware for admin routes
- `public/` — static assets

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

- `GOOGLE_CLOUD_PROJECT` — GCP project ID (required)
- `GOOGLE_CLOUD_LOCATION` — Vertex AI region (optional, defaults to `us-central1`)
- `ADMIN_PASSWORD` — password for admin login

## Verification Workflow

- Fast iteration: `bun run check` — auto-fixes formatting and lint, then runs typecheck + test in parallel
- Full validation: `bun run check:full` — adds production build
- Watch mode: `bun run test:watch`

## Architectural Constraints

- Keep data in JSON files until D1 migration is implemented.
- Prefer simple synchronous UI components for straightforward testing.
- When architecture or toolchain choices change, update this document in the same task.
