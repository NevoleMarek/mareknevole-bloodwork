# Upload Wizard Design

## Overview

Replace the current single-shot PDF upload with a two-step wizard that lets the user review and correct AI-extracted data before saving. The wizard uses two Gemini agentic steps with JSON context passed between them, and saves directly to D1.

## Architecture

### Single-page wizard

One route (`/admin/upload`) with a single component managing state as a discriminated union. No URL-based step routing — the wizard lives entirely in client-side state. Losing the page loses progress (acceptable for a short wizard).

### Two-panel layout

- **Left panel:** Wizard steps (upload → review extraction → review mapping)
- **Right panel:** PDF preview via embedded `<iframe>` or `<object>`, visible throughout both steps
- **Mobile (below `md:`):** PDF preview hidden, left panel only

## Wizard State Machine

```typescript
type WizardState =
  | { step: "upload" }
  | { step: "extracting"; pdfUrl: string }
  | { step: "review-extraction"; pdfUrl: string; date: string; variables: ExtractedVariable[] }
  | { step: "mapping"; pdfUrl: string; date: string; variables: ExtractedVariable[] }
  | { step: "review-mapping"; pdfUrl: string; date: string; mappings: MappedVariable[] }
  | { step: "saving"; pdfUrl: string; date: string; mappings: MappedVariable[] }
  | { step: "done" }
  | { step: "error"; message: string; returnTo: Exclude<WizardState, { step: "error" }> }
```

Transitions are strictly forward: upload → extracting → review-extraction → mapping → review-mapping → saving → done. The only backward transition is "Back" from review-mapping to review-extraction. The `error` state carries `returnTo` so the user can retry from where they were.

## Types

```typescript
type ExtractedVariable = { label: string; value: number; unit: string }

type MappedVariable = {
  label: string           // original from PDF
  originalValue: number
  originalUnit: string
  vocabularyKey: string   // existing or new key
  convertedValue: number  // after unit conversion
  convertedUnit: string   // target unit from vocabulary
  isNew: boolean          // true = new vocabulary entry
  referenceRange?: { min: number; max: number } // for new entries only
}
```

## API Endpoints

All three endpoints require auth (session cookie). Add `/api/map` and `/api/readings` to the middleware matcher.

### POST `/api/extract`

Receives PDF as FormData. Sends to Gemini (2.5 Flash) with a simplified prompt that extracts only date, label, value, and unit (no reference ranges, no status).

**Input:** FormData with `pdf` field

**Output:**
```json
{
  "date": "2025-06-15",
  "variables": [
    { "label": "Glucose", "value": 5.5, "unit": "mmol/L" },
    { "label": "Hemoglobin", "value": 14.2, "unit": "g/dL" }
  ]
}
```

### POST `/api/map`

Receives user-edited variables and current vocabulary. Sends to Gemini for fuzzy matching and unit conversion.

**Input:**
```json
{
  "variables": [
    { "label": "Glucose", "value": 5.5, "unit": "mmol/L" }
  ],
  "vocabulary": [
    { "key": "glucose", "label": "Glucose", "unit": "mg/dL", "referenceRange": { "min": 70, "max": 100 } }
  ]
}
```

**Output:**
```json
{
  "mappings": [
    {
      "label": "Glucose",
      "originalValue": 5.5,
      "originalUnit": "mmol/L",
      "vocabularyKey": "glucose",
      "convertedValue": 99.1,
      "convertedUnit": "mg/dL",
      "isNew": false
    },
    {
      "label": "CRP",
      "originalValue": 0.8,
      "originalUnit": "mg/L",
      "vocabularyKey": "crp",
      "convertedValue": 0.8,
      "convertedUnit": "mg/L",
      "isNew": true,
      "referenceRange": { "min": 0, "max": 3 }
    }
  ]
}
```

The AI handles both fuzzy matching (e.g., "Hba1c" → "HbA1c") and unit conversion math. For new entries, it proposes a snake_case key and reference range from medical knowledge.

### POST `/api/readings`

Pure D1 write. No AI calls.

**Input:**
```json
{
  "date": "2025-06-15",
  "source": "blood-test-2025-06-15.pdf",
  "measurements": [
    { "vocabularyKey": "glucose", "value": 99.1, "unit": "mg/dL", "status": "normal" }
  ],
  "newVocabulary": [
    { "key": "crp", "label": "CRP", "unit": "mg/L", "referenceRange": { "min": 0, "max": 3 } }
  ]
}
```

**Output:**
```json
{ "readingId": "uuid" }
```

All inserts (new vocabulary + reading + measurements) go through `db.batch()` for atomicity.

## Status Derivation

Status is computed deterministically on the client before saving, not by the AI:

- `value < referenceRange.min` → `"low"`
- `value > referenceRange.max` → `"high"`
- otherwise → `"normal"`

No "borderline" status. For new vocabulary entries, the AI-proposed reference range is used.

## Gemini Prompts

### Extract prompt

Simplified from current: only extracts date, label, value, unit. No reference ranges or status. Receives PDF as base64 inline data. Returns JSON.

### Map prompt

Receives extracted variables (user-edited) and full vocabulary as JSON. Returns mappings with:
- Fuzzy label matching to existing vocabulary keys
- Unit conversion with converted values
- New entry proposals for unmatched variables (snake_case key, reference range)

## Step 1 UI: Review Extraction

- Step indicator showing "1. Extract" active, "2. Map" inactive
- Editable date input field
- Editable table: label, value, unit columns with text inputs, delete button per row
- "Add variable" button below table
- "Next: Map Variables →" button

## Step 2 UI: Review Mapping

- Step indicator showing "1. Extract" inactive, "2. Map" active
- Mapping table: extracted label (read-only), arrow, dropdown to select vocabulary entry (or "New"), converted value, converted unit
- New entries highlighted with a "New" badge
- "← Back" button and "Save Reading" button

## Migration from Current Code

- Delete the current two-agent flow in `/api/extract/route.ts` (the one that writes to JSON files)
- Delete `data/vocabulary.json` and `data/readings.json` reads/writes from the extract route
- Remove or repurpose `prompts/extract.txt` and `prompts/vocabulary-merge.txt`
- Update the admin page to use the new wizard component instead of `PdfUploader`
- Add `/api/map/:path*` and `/api/readings/:path*` to the middleware matcher
