# Supplement Admin Redesign — Design Spec

## Goal

Redesign the supplement admin page to make the active supplements table editable inline, replace the freeform "since" field with a month picker, replace the flat add form with a stacked card-style form, and ensure all edits generate changelog entries.

## Current state

- Active supplements shown in a read-only table with a separate inline add form (flat row of inputs)
- "Since" is a freeform text input (e.g. "Jan 2025")
- Remove action uses `prompt()` for changelog date
- Editing a supplement's dose/frequency requires the API but has no admin UI

## Design

### Active Supplements Table

The table displays all active supplements with columns: Supplement, Dose, Frequency, Since, and actions (Edit, Remove).

**Normal state:** Each row shows values as text. Edit and Remove links appear on the right side, styled as subtle zinc-400 text.

**Edit mode:** Clicking "Edit" on a row transitions that row to edit mode:

- All cells become inputs (text inputs for name/dose/frequency, `<input type="month">` for since)
- Row gets a light background (`bg-stone-50`) to visually distinguish it
- Save and Cancel buttons replace Edit/Remove
- Below the input row, a "Changelog date" field appears with a `<input type="date">` defaulting to today
- On Save: PUT to `/api/supplements` with the updated values and changelog date. The API diffs old vs new values and generates a changelog description (e.g. "Changed Creatine dose from 5g to 10g")
- On Cancel: revert to normal state, no changes

**Remove confirmation:** Clicking "Remove" replaces the row content with a confirmation bar:

- Light red background (`bg-red-50`)
- Text: "Remove {name}?"
- Date picker defaulting to today
- Confirm (red border) and Cancel buttons
- On Confirm: DELETE to `/api/supplements` with id and changelog date
- Replaces the current `prompt()` approach

### Add Supplement Form

A stacked card-style form always visible below the table. Fields:

| Field          | Input type     | Default |
| -------------- | -------------- | ------- |
| Name           | text           | empty   |
| Dose           | text           | empty   |
| Frequency      | text           | "daily" |
| Since          | `type="month"` | empty   |
| Changelog date | `type="date"`  | today   |

Each field has a label on the left (90px wide) and the input stretching to fill. "Add" button below, aligned with inputs.

On submit: POST to `/api/supplements`. Form resets after success.

### Changelog Section

No changes to the changelog display or editing. It continues to show entries grouped by date with inline edit/delete on hover.

Edits and removals from the table automatically generate changelog entries via the existing API.

## Data changes

### `started_at` format

Changes from freeform text to `YYYY-MM` format (e.g. "2025-01").

**Storage:** `started_at` column remains TEXT. New values are stored as `YYYY-MM`.

**Migration:** Existing freeform values need a one-time conversion. Known current values should be mapped (e.g. "Jan 2025" → "2025-01"). Run as a manual SQL migration against D1.

**Display:** Dashboard `SupplementTable` formats `YYYY-MM` as "Jan 2025" for display using `Date` parsing.

### API changes

**PUT `/api/supplements`** — already exists. Needs to accept `changelogDate` in the request body (currently auto-generates date). The diff logic for changelog descriptions already exists.

**POST `/api/supplements`** — already accepts `changelogDate`. The `startedAt` field will now receive `YYYY-MM` instead of freeform text.

**DELETE `/api/supplements`** — no changes needed, already accepts `changelogDate`.

## Components changed

- `components/admin/supplement-editor.tsx` — major rewrite: add row-level edit mode, remove confirmation, card-style add form, month picker for since
- `components/dashboard/supplement-table.tsx` — format `YYYY-MM` as readable month+year
- `app/api/supplements/route.ts` — minor: ensure PUT accepts `changelogDate` param

## Out of scope

- Bulk editing
- Sorting/filtering the active supplements table
- Supplement categories or grouping
