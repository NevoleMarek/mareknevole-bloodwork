# Architecture

## Current Stack

- Framework: `Next.js` App Router
- UI: `React` with `TypeScript`
- Package manager: `bun`
- Styling: `Tailwind CSS`
- Testing: `Vitest`, `jsdom`, and Testing Library
- Code quality: `ESLint` and `Prettier`
- AI: `@google-cloud/vertexai` — Gemini 2.5 Flash via Vertex AI

## Project Structure

- `app/`: Next.js routes, layout, and global styles
- `app/api/extract/route.ts`: POST route — 2-agent pipeline: Agent 1 extracts structured JSON from a PDF; Agent 2 merges it against the vocabulary, persists new entries and the reading
- `app/api/data/route.ts`: GET route that returns vocabulary and all stored readings
- `components/`: reusable UI building blocks
- `data/vocabulary.json`: dynamic registry of known test names, units, and reference ranges; grows as new PDFs are imported
- `data/readings.json`: all ingested bloodwork readings (one entry per PDF import)
- `prompts/extract.txt`: Agent 1 prompt — instructs Gemini to output a structured `ExtractedReading` JSON
- `prompts/vocabulary-merge.txt`: Agent 2 prompt — normalizes extracted measurements against the vocabulary and identifies new entries
- `types/bloodwork.ts`: shared TypeScript types for vocabulary, readings, and agent I/O
- `specs/`: living product and architecture documentation
- `public/`: static assets served by Next.js

## Ingestion Pipeline

1. User uploads a PDF via the dashboard.
2. **Agent 1** (Gemini + `prompts/extract.txt`): parses the PDF and returns an `ExtractedReading` JSON with raw test labels, values, units, and reference ranges.
3. **Agent 2** (Gemini + `prompts/vocabulary-merge.txt`): receives the extracted reading and the current vocabulary; fuzzy-matches tests to vocabulary entries, identifies any new tests, and returns a `MergeResult` with normalized measurements and new vocabulary entries.
4. New vocabulary entries are appended to `data/vocabulary.json`.
5. A `BloodworkReading` is appended to `data/readings.json`.
6. The dashboard reloads from `/api/data` and derives metrics from the latest reading.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

- `GOOGLE_CLOUD_PROJECT` — GCP project ID (required)
- `GOOGLE_CLOUD_LOCATION` — Vertex AI region (optional, defaults to `us-central1`)

Authentication uses Application Default Credentials. Run `gcloud auth application-default login` before starting the dev server.

## Verification Workflow

- Fast iteration command: `bun run check`
- Full verification command: `bun run check:full`
- Watch mode for tests: `bun run test:watch`

`bun run check` is intended for the everyday inner loop and should stay fast.
`bun run check:full` adds slower milestone validation, including a production build.

## Architectural Constraints

- Keep the project local-only unless the user asks for deployment-oriented changes.
- Prefer simple synchronous UI components when possible to keep unit testing straightforward.
- When architecture or toolchain choices change, update this document in the same task.
