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
| `/admin/upload`      | Auth   | Upload wizard                   |
| `/admin/data`        | Auth   | Readings management             |
| `/admin/vocabulary`  | Auth   | Vocabulary editor               |
| `/admin/supplements` | Auth   | Supplement stack editor         |

## Auth

Password-based authentication via middleware + session cookie. Middleware protects all `/admin/*` routes except the login page itself.

## API Routes

| Method | Route                 | Purpose                                               |
| ------ | --------------------- | ----------------------------------------------------- |
| GET    | `/api/data`           | Return vocabulary and all readings                    |
| POST   | `/api/extract`        | PDF upload → Gemini variable extraction               |
| POST   | `/api/map`            | Variables → Gemini vocabulary mapping                 |
| POST   | `/api/readings`       | Save reading + vocabulary to D1                       |
| POST   | `/api/auth`           | Login, returns session cookie                         |
| GET    | `/api/vocabulary`     | Return vocabulary                                     |
| PUT    | `/api/vocabulary`     | Update vocabulary entries                             |
| GET    | `/api/supplements`    | Return supplement stack                               |
| PUT    | `/api/supplements`    | Update supplement stack                               |
| POST   | `/api/health-metrics` | Upsert daily health metrics (bearer token or session) |

## Component Architecture

- `components/dashboard/` — public dashboard components
  - `section-nav` — sticky nav bar with scroll-spy and logo animation
  - `metric-card` — single metric with value, unit, status, and range bar
  - `range-bar` — bounded zone visualization with value marker
  - `trend-chart` — sparkline trends over time
  - `supplement-table` — always-visible supplement list
  - `changelog-list` — paginated changelog grouped by day
  - `health-grid` — health metrics grid with period selector
  - `health-chart` — individual metric time-series with trend line
  - `blood-pressure-chart` — combined systolic/diastolic chart
- `components/admin/` — admin data management
  - `upload-wizard` — main wizard: state machine, two-panel layout
  - `step-upload` — PDF drag-and-drop upload
  - `step-review-extraction` — editable table of extracted variables
  - `step-review-mapping` — mapping table with vocabulary dropdowns
  - `readings-table` — tabular view of all readings
  - `vocabulary-editor` — edit test names, units, and ranges
  - `supplement-editor` — edit supplements with changelog
- `components/ui/` — shared primitives
  - `accordion` — collapsible section

## Data

D1 SQLite database with tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`, `health_metrics`.

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
- `HEALTH_API_TOKEN` — bearer token for iOS Shortcut health metrics sync

## Verification Workflow

- Fast iteration: `bun run check` — auto-fixes formatting and lint, then runs typecheck + test in parallel
- Full validation: `bun run check:full` — adds production build
- Watch mode: `bun run test:watch`

## Architectural Constraints

- Prefer simple synchronous UI components for straightforward testing.
- When architecture or toolchain choices change, update this document in the same task.
