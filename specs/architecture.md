# Architecture

## Current Stack

- Framework: `Next.js` App Router
- UI: `React` with `TypeScript`
- Package manager: `bun`
- Styling: `Tailwind CSS`
- Testing: `Vitest`, `jsdom`, and Testing Library
- Code quality: `ESLint` and `Prettier`
- AI: `@google/generative-ai` — Gemini via Google Generative AI SDK
- Deployment: Cloudflare Workers with `@opennextjs/cloudflare` adapter

## Route Structure

| Route                | Access | Purpose                         |
| -------------------- | ------ | ------------------------------- |
| `/`                  | Public | Dashboard with metrics & trends |
| `/admin`             | Auth   | Login page                      |
| `/admin/upload`      | Auth   | Upload wizard                   |
| `/admin/data`        | Auth   | Readings management             |
| `/admin/vocabulary`  | Auth   | Vocabulary editor               |
| `/admin/supplements` | Auth   | Supplement stack editor         |
| `/admin/health`      | Auth   | Health import & visibility      |

## Auth

Password-based authentication via middleware + session cookie. Middleware protects all `/admin/*` routes except the login page itself.

## API Routes

| Method | Route                | Purpose                                      |
| ------ | -------------------- | -------------------------------------------- |
| POST   | `/api/auth`          | Login, returns session cookie                |
| DELETE | `/api/auth`          | Logout, clears session cookie                |
| GET    | `/api/data`          | Return vocabulary and all readings           |
| POST   | `/api/extract`       | PDF upload → Gemini variable extraction      |
| POST   | `/api/map`           | Variables → Gemini vocabulary mapping        |
| POST   | `/api/research`      | Variables → Gemini research for mapping      |
| POST   | `/api/readings`      | Save reading + vocabulary to D1              |
| DELETE | `/api/readings`      | Delete a reading                             |
| PUT    | `/api/vocabulary`    | Update vocabulary entries                    |
| POST   | `/api/vocabulary`    | Add vocabulary entry                         |
| DELETE | `/api/vocabulary`    | Delete vocabulary entry                      |
| GET    | `/api/supplements`   | Return active supplements + changelog        |
| POST   | `/api/supplements`   | Add supplement with changelog entry          |
| PUT    | `/api/supplements`   | Update supplement fields with changelog      |
| DELETE | `/api/supplements`   | Remove supplement with changelog entry       |
| PUT    | `/api/changelog`     | Edit changelog entry description             |
| DELETE | `/api/changelog`     | Delete changelog entry                       |
| POST   | `/api/health-import` | Upload parsed health metrics JSON (session)  |
| GET    | `/api/health-config` | Fetch all health metric configs (session)    |
| PATCH  | `/api/health-config` | Toggle metric dashboard visibility (session) |

## Component Architecture

- `components/dashboard/` — public dashboard components
  - `section-nav` — sticky nav bar with scroll-spy and logo animation
  - `metric-card` — single metric with value, unit, status, and range bar
  - `range-bar` — bounded zone visualization with value marker
  - `trend-panel` — sparkline trends over time
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
  - `step-review-research` — Gemini research results for variable identification
  - `readings-table` — tabular view of all readings
  - `vocabulary-editor` — edit test names, units, and ranges
  - `supplement-editor` — edit supplements with changelog
  - `health-admin` — client wrapper for health import + visibility
  - `health-import` — drag-and-drop JSON import
  - `health-visibility` — metric visibility toggle chips
- `components/ui/` — shared primitives
  - `accordion` — collapsible section

## Caching

The public dashboard (`/`) uses ISR with a 1-hour revalidation interval. Cache infrastructure:

- **Incremental cache**: Cloudflare KV (`NEXT_INC_CACHE_KV` binding)
- **Tag cache**: D1 `revalidations` table (`NEXT_TAG_CACHE_D1` binding, same database)
- **On-demand revalidation**: All mutation API routes call `revalidatePath("/")` to invalidate the cache immediately after data changes

Health metrics are filtered server-side by period (URL search param `?period=1M|6M|1Y|ALL`, default `6M`). Each period variant is cached independently.

## Data

D1 SQLite database with tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`, `health_metrics`, `health_metric_config`, `revalidations`.

## Project Structure

- `app/` — Next.js routes, layout, and global styles
- `components/` — reusable UI components (dashboard, admin, ui)
- `data/` — JSON data files
- `types/bloodwork.ts` — shared TypeScript types
- `scripts/parse-health-export.ts` — CLI: parse Apple Health XML → JSON
- `prompts/` — Gemini prompt templates
- `specs/` — living product and architecture documentation
- `middleware.ts` — auth middleware for admin routes
- `public/` — static assets

## Environment Variables

Cloudflare Workers secrets (set via `bunx wrangler secret put`):

- `GEMINI_API_KEY` — Google Generative AI API key
- `ADMIN_PASSWORD` — password for admin login

## Verification Workflow

- Fast iteration: `bun run check` — auto-fixes formatting and lint, then runs typecheck + test in parallel
- Full validation: `bun run check:full` — adds production build
- Watch mode: `bun run test:watch`

## Architectural Constraints

- Prefer simple synchronous UI components for straightforward testing.
- When architecture or toolchain choices change, update this document in the same task.
