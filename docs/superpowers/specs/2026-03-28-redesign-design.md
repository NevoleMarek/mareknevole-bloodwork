# Bloodwork Redesign

Full redesign of the bloodwork dashboard: new visual system, route architecture, supplement tracking, Cloudflare deployment with D1 database.

## Visual System

Typography-driven design built on Geist Mono. No dot grid, no ASCII box corners — structure comes from whitespace, thin borders, and type hierarchy.

### Palette

**Surfaces & text (zinc scale):**

| Token    | Value                | Usage                          |
| -------- | -------------------- | ------------------------------ |
| `bg`     | `#fafaf9` (stone-50) | Page background                |
| `card`   | `#ffffff`            | Card surfaces                  |
| `text`   | `#18181b` (zinc-900) | Primary text, metric values    |
| `muted`  | `#71717a` (zinc-500) | Secondary text, units          |
| `subtle` | `#a1a1aa` (zinc-400) | Labels, dates, section headers |
| `border` | `#e4e4e7` (zinc-200) | Card borders, dividers         |
| `track`  | `#f4f4f5` (zinc-100) | Range bar background           |

**Status colors (desaturated):**

| Status     | Color                      | Usage               |
| ---------- | -------------------------- | ------------------- |
| Normal     | `green-400` at 30% opacity | Range bar zone fill |
| Borderline | `amber-400` at 30% opacity | Range bar zone fill |
| High       | `red-400` at 30% opacity   | Range bar zone fill |
| Low        | `blue-400` at 30% opacity  | Range bar zone fill |

Status is communicated only through the range bar tint. No border accents, no badge colors, no colored text.

### Typography

- **Font:** Geist Mono exclusively, set on `body`
- **Title:** `text-2xl font-semibold tracking-tight` — "BLOODWORK"
- **Subtitle:** `text-[10px] tracking-widest uppercase text-subtle` — "MAREK NEVOLE"
- **Section labels:** `text-[9px] tracking-[2px] uppercase text-subtle` — "METRICS · SEP 15, 2025"
- **Metric values:** `text-3xl font-bold text-text`
- **Units & ranges:** `text-xs text-muted`
- **Table body:** `text-[11px] text-text`

### Spacing

- Base unit: 4px
- Card padding: 16px
- Card gap: 16px
- Section gap: 32px
- Page padding: 24px
- Max width: 960px

### Borders

Thin, uniform: `border border-zinc-200`. No rounded corners. No shadows. No accents.

## Dashboard Page (`/`)

Public, read-only, server-rendered. No interactive elements except the supplement stack accordion toggle.

### Layout (top to bottom)

**1. Header**

- "BLOODWORK" title (left)
- "MAREK NEVOLE" subtitle below (left)

**2. Supplement Stack (accordion)**

Collapsed by default. Shows summary: "{n} active · updated {date}".

Expanded shows two parts:

_Current stack table:_

| Column     | Content                 |
| ---------- | ----------------------- |
| Supplement | Name                    |
| Dose       | Amount + unit           |
| Frequency  | Daily / 2x daily / etc. |
| Since      | Month + year started    |

_Changelog:_ Reverse-chronological list of changes. Each entry: date + description (e.g., "Added Ashwagandha 600 mg", "Removed Zinc", "Changed Creatine from 3 g to 5 g"). Auto-derived from stack mutations in the admin.

**3. Metrics section**

Section label: "METRICS · {latest reading date}"

4-column grid of metric cards. Each card contains:

- Label: uppercase, tracked, muted
- Value: large bold number
- Unit: small muted text
- Range bar: track background, status-colored zone showing reference range, dark marker showing value position
- Min/max labels below the range bar

**4. Trends section**

Section label: "TRENDS"

Single white card containing:

- Legend: clickable metric names with line style indicators (solid + dashed). Up to 2 visible at a time.
- Period selector: 6M / 1Y / ALL toggle buttons
- Line chart: solid black line for primary metric, dashed gray for secondary. Minimal axis labels. Dots on data points.
- Default selection: show the two metrics with the most readings. User can click legend items to swap which metrics are displayed.

## Admin Pages (`/admin/*`)

All admin routes are protected by middleware. Client-side components with data mutations.

### Auth

- `ADMIN_PASSWORD` environment variable
- Login page at `/admin` with a single password field
- On correct password: set HTTP-only, secure, same-site session cookie
- Next.js middleware checks session cookie on all `/admin/*` routes except `/admin` itself (the login page)
- Redirect to `/admin` login if no valid session

### `/admin/data`

- PDF upload with drag-and-drop
- Triggers 2-agent extraction pipeline (existing logic)
- Table of all readings with ability to edit/delete
- Markdown export button

### `/admin/vocabulary`

- Table of test definitions (key, label, unit, reference min, reference max)
- Inline add/edit/delete

### `/admin/supplements`

- Table of current stack entries (name, dose, frequency, since date)
- Add/edit/remove entries
- Changelog is auto-generated: when a supplement is added, removed, or its dose/frequency changes, a changelog entry is created with the date and description of the change

## Component Architecture

```
components/
  dashboard/
    metric-card.tsx          # Single metric display with range bar
    range-bar.tsx            # Status-colored range visualization
    trend-chart.tsx          # Recharts line chart with period selector
    supplement-stack.tsx     # Accordion: table + changelog
  admin/
    pdf-uploader.tsx         # PDF upload + extraction
    readings-table.tsx       # View/edit readings
    vocabulary-editor.tsx    # Test definition CRUD
    supplement-editor.tsx    # Stack management
  ui/
    accordion.tsx            # Collapse/expand primitive
```

Dashboard components are server components (or thin client wrappers where interactivity is needed — accordion toggle, trend chart period selector).

Admin components are client components that call API routes for mutations.

## Data Model

Moving from JSON files to Cloudflare D1 (SQLite).

### Tables

**vocabulary**

- `key` TEXT PRIMARY KEY — unique identifier (e.g., "glucose")
- `label` TEXT — display name (e.g., "Glucose")
- `unit` TEXT — measurement unit (e.g., "mg/dL")
- `reference_min` REAL — lower bound of normal range
- `reference_max` REAL — upper bound of normal range

**readings**

- `id` TEXT PRIMARY KEY
- `date` TEXT — ISO date
- `source` TEXT — filename of uploaded PDF

**measurements**

- `id` TEXT PRIMARY KEY
- `reading_id` TEXT REFERENCES readings(id)
- `vocabulary_key` TEXT REFERENCES vocabulary(key)
- `value` REAL
- `unit` TEXT
- `status` TEXT — "normal" | "borderline" | "high" | "low"

**supplements**

- `id` TEXT PRIMARY KEY
- `name` TEXT
- `dose` TEXT — amount + unit (e.g., "5000 IU")
- `frequency` TEXT — "daily", "2x daily", etc.
- `started_at` TEXT — month + year
- `stopped_at` TEXT NULL — NULL if active
- `created_at` TEXT
- `updated_at` TEXT

**supplement_changelog**

- `id` TEXT PRIMARY KEY
- `date` TEXT — ISO date
- `description` TEXT — human-readable change description
- `created_at` TEXT

### Migration from JSON

One-time script to read `data/readings.json`, `data/vocabulary.json` and seed the D1 database. JSON files kept as backup but no longer used by the app.

## Infrastructure

### Platform: Cloudflare Pages

- Adapter: `@opennextjs/cloudflare`
- D1 SQLite database (free tier: 5GB)
- Environment variables for `ADMIN_PASSWORD` and D1 binding
- Custom domain via Cloudflare DNS

### API Routes

| Method | Route                  | Purpose                                            |
| ------ | ---------------------- | -------------------------------------------------- |
| GET    | `/api/data`            | Returns vocabulary + latest reading + measurements |
| GET    | `/api/supplements`     | Returns active supplements + changelog             |
| POST   | `/api/extract`         | Upload PDF, run extraction pipeline                |
| PUT    | `/api/vocabulary`      | Update a vocabulary entry                          |
| POST   | `/api/vocabulary`      | Create a vocabulary entry                          |
| DELETE | `/api/vocabulary`      | Delete a vocabulary entry                          |
| PUT    | `/api/readings/:id`    | Update a reading                                   |
| DELETE | `/api/readings/:id`    | Delete a reading                                   |
| POST   | `/api/supplements`     | Add a supplement                                   |
| PUT    | `/api/supplements/:id` | Update a supplement                                |
| DELETE | `/api/supplements/:id` | Remove a supplement (sets stopped_at)              |

### Deploy Flow

`git push` to main → Cloudflare Pages auto-builds and deploys.
