# Enhanced PDF Extraction Pipeline — Design Spec

## Summary

Upgrade the PDF upload wizard to use newer Gemini models, translate extracted labels to English medical terms, and add a research step that uses Gemini 3.1 Pro to look up reference ranges and descriptions for newly discovered biomarkers.

## Model Changes

| Step | Current | New |
|------|---------|-----|
| Extract | `gemini-2.5-flash` | `gemini-3-flash-preview` |
| Map | `gemini-2.5-flash` | `gemini-3-flash-preview` |
| Research (new) | — | `gemini-3.1-pro-preview` |

The `callGemini` function accepts a model parameter so each caller can specify which model to use.

## Step 1: Extract — Prompt Update

The extraction prompt adds an instruction to translate all variable labels to well-known English medical abbreviations or terms. Examples:

- "Glukóza" → "Glucose"
- "Bílé krvinky" → "WBC"
- "Hemoglobin" stays "Hemoglobin"

The output schema stays the same (`ExtractResponse`).

## Step 2: Map — No Structural Change

Same flow as today. Uses `gemini-3-flash-preview` instead of `gemini-2.5-flash`. No prompt or schema changes.

## Step 3: Research (New)

### When it runs

Only when the mapping step produces entries with `isNew: true`. If all variables map to existing vocabulary, skip straight to save.

### API endpoint

`POST /api/research` receives only the new entries (filtered on the client before sending). Uses `gemini-3.1-pro-preview`.

### Request

```typescript
type ResearchRequest = {
  newEntries: {
    vocabularyKey: string;
    label: string;
    unit: string;
    referenceRange: { min: number; max: number };
  }[];
};
```

### Response

```typescript
type ResearchedEntry = {
  vocabularyKey: string;
  description: string;
  referenceRange: { min: number; max: number };
};

type ResearchResponse = {
  entries: ResearchedEntry[];
};
```

The research step may refine the reference ranges proposed by the mapping step and adds a description for each new biomarker.

### Prompt

Instructs Gemini 3.1 Pro to:
- Research each biomarker by its label and unit
- Provide a concise description (1-2 sentences: what it measures, clinical significance)
- Provide evidence-based reference ranges for healthy adults
- Return JSON matching `ResearchResponse`

## Wizard Flow

```
Upload → Extract (3-flash) → Review Extraction
       → Map (3-flash) → Review Mapping
       → Research (3.1-pro, only new entries) → Review Research
       → Save
```

### Step indicator

Updates from `["Extract", "Map"]` to `["Extract", "Map", "Research"]`. The third step only appears when there are new entries after mapping.

### Review Research step

- Shows each new entry with its researched description and reference range
- User can edit description text and min/max range values
- Confirm proceeds to save; back returns to review-mapping

## Schema Migration

Add a nullable `description` column to the `vocabulary` table:

```sql
ALTER TABLE vocabulary ADD COLUMN description TEXT;
```

For new entries created through the wizard, description is populated from the research step. Existing entries keep `NULL` — no backfill.

## Type Changes

### `VocabularyEntry`

```typescript
type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
};
```

### `WizardState`

New states added:

```typescript
| { step: "researching"; pdfUrl: string; date: string; mappings: MappedVariable[] }
| {
    step: "review-research";
    pdfUrl: string;
    date: string;
    mappings: MappedVariable[];
    researched: ResearchedEntry[];
  }
```

### `MappedVariable`

No change — `referenceRange` and `isNew` already exist.

## Files Changed

- `lib/gemini.ts` — accept model parameter
- `prompts/extract-variables.ts` — add English translation instruction
- `prompts/research-variables.ts` — new prompt for research step
- `app/api/research/route.ts` — new API endpoint
- `app/api/extract/route.ts` — use `gemini-3-flash-preview`
- `app/api/map/route.ts` — use `gemini-3-flash-preview`
- `types/wizard.ts` — new types and wizard states
- `types/bloodwork.ts` — add `description` to `VocabularyEntry`
- `db/schema.sql` — add `description` column
- `db/queries.ts` — update vocabulary queries to include description
- `components/admin/upload-wizard.tsx` — new step logic, step indicator
- `components/admin/step-review-research.tsx` — new review component
- `app/api/readings/route.ts` — pass description when saving new vocabulary
