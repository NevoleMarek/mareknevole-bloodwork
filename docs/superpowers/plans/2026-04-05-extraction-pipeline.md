# Enhanced PDF Extraction Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the upload wizard to use Gemini 3 Flash / 3.1 Pro, translate labels to English, and add a research step for new biomarkers with descriptions.

**Architecture:** Three-step LLM pipeline: Extract (3-flash) → Map (3-flash) → Research (3.1-pro, new entries only). New `description` column on vocabulary. New wizard step with review UI.

**Tech Stack:** Next.js, Cloudflare Workers/D1, `@google/generative-ai`, React, Tailwind CSS

---

## File Map

| File                                        | Action | Responsibility                                       |
| ------------------------------------------- | ------ | ---------------------------------------------------- |
| `lib/gemini.ts`                             | Modify | Accept model parameter                               |
| `prompts/extract-variables.ts`              | Modify | Add English translation rule                         |
| `prompts/research-variables.ts`             | Create | Research prompt for new biomarkers                   |
| `types/bloodwork.ts`                        | Modify | Add `description` to `VocabularyEntry`               |
| `types/wizard.ts`                           | Modify | Add research types and wizard states                 |
| `db/schema.sql`                             | Modify | Add `description` column                             |
| `db/queries.ts`                             | Modify | Include description in vocabulary queries and mapper |
| `app/api/extract/route.ts`                  | Modify | Use `gemini-3-flash-preview`                         |
| `app/api/map/route.ts`                      | Modify | Use `gemini-3-flash-preview`                         |
| `app/api/research/route.ts`                 | Create | Research endpoint using 3.1 Pro                      |
| `app/api/readings/route.ts`                 | Modify | Save description with new vocabulary                 |
| `components/admin/step-review-research.tsx` | Create | Review UI for researched entries                     |
| `components/admin/upload-wizard.tsx`        | Modify | Wire in research step + conditional step indicator   |

---

### Task 1: Add model parameter to `callGemini`

**Files:**

- Modify: `lib/gemini.ts`

- [ ] **Step 1: Update `callGemini` signature to accept a model name**

In `lib/gemini.ts`, change the function to accept a `model` parameter:

```typescript
export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  pdfBase64?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });
  // ... rest unchanged
```

- [ ] **Step 2: Update extract route to pass model**

In `app/api/extract/route.ts`, change the `callGemini` call:

```typescript
const text = await callGemini(
  apiKey,
  "gemini-3-flash-preview",
  extractVariablesPrompt,
  base64,
);
```

- [ ] **Step 3: Update map route to pass model**

In `app/api/map/route.ts`, change the `callGemini` call:

```typescript
const text = await callGemini(apiKey, "gemini-3-flash-preview", prompt);
```

- [ ] **Step 4: Run `bun run check` and verify it passes**

- [ ] **Step 5: Commit**

```bash
git add lib/gemini.ts app/api/extract/route.ts app/api/map/route.ts
git commit -m "refactor: add model parameter to callGemini, upgrade to gemini-3-flash-preview"
```

---

### Task 2: Add English translation to extraction prompt

**Files:**

- Modify: `prompts/extract-variables.ts`

- [ ] **Step 1: Update the extraction prompt**

Replace the content of `prompts/extract-variables.ts`:

```typescript
export const extractVariablesPrompt = `Extract all blood test results from this medical PDF report.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "date": "YYYY-MM-DD",
  "variables": [
    {
      "label": "Test Name In English",
      "value": 98.0,
      "unit": "mg/dL"
    }
  ]
}

Rules:
- "date": the specimen collection date from the report in YYYY-MM-DD format; if not found, use today's date
- "label": translate the test name to its well-known English medical abbreviation or term (e.g. "Glukóza" → "Glucose", "Bílé krvinky" → "WBC", "Červené krvinky" → "RBC", "Trombocyty" → "Platelets", "Hematokrit" → "Hematocrit"). Use standard medical abbreviations when they exist (WBC, RBC, HbA1c, TSH, ALT, AST, GGT, CRP, HDL, LDL, etc.)
- "value": numeric value only
- "unit": unit string as written in the report
- Include every individual test result; do not omit any`;
```

- [ ] **Step 2: Run `bun run check` and verify it passes**

- [ ] **Step 3: Commit**

```bash
git add prompts/extract-variables.ts
git commit -m "feat: instruct extraction to translate labels to English medical terms"
```

---

### Task 3: Add `description` to vocabulary schema and types

**Files:**

- Modify: `db/schema.sql`
- Modify: `types/bloodwork.ts`
- Modify: `db/queries.ts`
- Modify: `app/api/readings/route.ts`

- [ ] **Step 1: Add description column to schema**

In `db/schema.sql`, update the vocabulary table definition:

```sql
CREATE TABLE IF NOT EXISTS vocabulary (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL NOT NULL,
  reference_max REAL NOT NULL,
  description TEXT
);
```

- [ ] **Step 2: Run migration on local D1**

```bash
bunx wrangler d1 execute bloodwork-db --local --command="ALTER TABLE vocabulary ADD COLUMN description TEXT"
```

- [ ] **Step 3: Add `description` to `VocabularyEntry` type**

In `types/bloodwork.ts`, update the type:

```typescript
export type VocabularyEntry = {
  key: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
  description: string | null;
};
```

- [ ] **Step 4: Update `VocabularyRow` and `mapVocabularyRow` in `db/queries.ts`**

Update the row type at the top:

```typescript
type VocabularyRow = {
  key: string;
  label: string;
  unit: string;
  reference_min: number;
  reference_max: number;
  description: string | null;
};
```

Update the mapper:

```typescript
export function mapVocabularyRow(row: VocabularyRow): VocabularyEntry {
  return {
    key: row.key,
    label: row.label,
    unit: row.unit,
    referenceRange: { min: row.reference_min, max: row.reference_max },
    description: row.description,
  };
}
```

Update the `getVocabulary` query:

```typescript
export async function getVocabulary(
  db: D1Database,
): Promise<VocabularyEntry[]> {
  const { results } = await db
    .prepare(
      "SELECT key, label, unit, reference_min, reference_max, description FROM vocabulary ORDER BY label",
    )
    .all<VocabularyRow>();
  return results.map(mapVocabularyRow);
}
```

- [ ] **Step 5: Update vocabulary INSERT in `app/api/readings/route.ts`**

Update the insert statement for new vocabulary entries:

```typescript
for (const entry of body.newVocabulary) {
  statements.push(
    db
      .prepare(
        "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max, description) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        entry.key,
        entry.label,
        entry.unit,
        entry.referenceRange.min,
        entry.referenceRange.max,
        entry.description,
      ),
  );
}
```

- [ ] **Step 6: Fix any TypeScript errors caused by adding `description` to `VocabularyEntry`**

Anywhere a `VocabularyEntry` is constructed without `description`, add `description: null`. Check with `bun run typecheck` and fix all errors. Key places to check:

- `components/admin/vocabulary-editor.tsx` — anywhere vocabulary entries are created
- `components/admin/upload-wizard.tsx` — the `newVocabulary` construction in `handleSave`
- Any test files that construct `VocabularyEntry` objects

- [ ] **Step 7: Run `bun run check` and verify it passes**

- [ ] **Step 8: Commit**

```bash
git add db/schema.sql types/bloodwork.ts db/queries.ts app/api/readings/route.ts
git add -u  # catch any other files fixed in step 6
git commit -m "feat: add description column to vocabulary"
```

---

### Task 4: Add research types to wizard

**Files:**

- Modify: `types/wizard.ts`

- [ ] **Step 1: Add research types and wizard states**

Add these types after `MapResponse`:

```typescript
export type ResearchEntry = {
  vocabularyKey: string;
  label: string;
  unit: string;
  referenceRange: { min: number; max: number };
};

export type ResearchedEntry = {
  vocabularyKey: string;
  description: string;
  referenceRange: { min: number; max: number };
};

export type ResearchRequest = {
  newEntries: ResearchEntry[];
};

export type ResearchResponse = {
  entries: ResearchedEntry[];
};
```

Add new wizard states to the `WizardState` union (before the `saving` state):

```typescript
| {
    step: "researching";
    pdfUrl: string;
    date: string;
    mappings: MappedVariable[];
  }
| {
    step: "review-research";
    pdfUrl: string;
    date: string;
    mappings: MappedVariable[];
    researched: ResearchedEntry[];
  }
```

- [ ] **Step 2: Run `bun run check` and verify it passes**

- [ ] **Step 3: Commit**

```bash
git add types/wizard.ts
git commit -m "feat: add research types and wizard states"
```

---

### Task 5: Create research prompt and API route

**Files:**

- Create: `prompts/research-variables.ts`
- Create: `app/api/research/route.ts`

- [ ] **Step 1: Create the research prompt**

Create `prompts/research-variables.ts`:

```typescript
export function researchVariablesPrompt(entries: string): string {
  return `You are a medical reference assistant. Research the following blood test biomarkers and provide reference ranges and descriptions.

BIOMARKERS TO RESEARCH:
${entries}

For each biomarker, provide:
1. A concise description (1-2 sentences): what it measures, why it matters clinically
2. Standard reference ranges for healthy adults

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "entries": [
    {
      "vocabularyKey": "glucose",
      "description": "Measures blood sugar levels. Elevated values may indicate diabetes or insulin resistance.",
      "referenceRange": { "min": 70, "max": 100 }
    }
  ]
}

Rules:
- "vocabularyKey": must match the input vocabularyKey exactly
- "description": 1-2 sentences, factual, clinical significance
- "referenceRange": standard reference range for healthy adults in the given unit
- Maintain the same order as the input`;
}
```

- [ ] **Step 2: Create the research API route**

Create `app/api/research/route.ts`:

```typescript
import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import { researchVariablesPrompt } from "@/prompts/research-variables";
import type { ResearchRequest, ResearchResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const apiKey = env.GEMINI_API_KEY as string;
  assert(apiKey, "GEMINI_API_KEY is required");

  const body = (await request.json()) as ResearchRequest;
  assert(body.newEntries.length > 0, "No entries to research");

  const prompt = researchVariablesPrompt(
    JSON.stringify(body.newEntries, null, 2),
  );

  const text = await callGemini(apiKey, "gemini-3.1-pro-preview", prompt);
  const result = parseGeminiJson<ResearchResponse>(text);

  assert(result.entries.length > 0, "No research results returned");

  return Response.json(result);
}
```

- [ ] **Step 3: Run `bun run check` and verify it passes**

- [ ] **Step 4: Commit**

```bash
git add prompts/research-variables.ts app/api/research/route.ts
git commit -m "feat: add research prompt and API route using gemini-3.1-pro"
```

---

### Task 6: Create review-research component

**Files:**

- Create: `components/admin/step-review-research.tsx`

- [ ] **Step 1: Create the review component**

Create `components/admin/step-review-research.tsx`. Follow the style from `step-review-mapping.tsx` — zinc palette, `text-[9px]` section labels, `text-xs` body, no rounded corners, no shadows.

```tsx
"use client";

import type { ResearchedEntry } from "@/types/wizard";

type Props = {
  researched: ResearchedEntry[];
  onResearchedChange: (entries: ResearchedEntry[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
};

export function StepReviewResearch({
  researched,
  onResearchedChange,
  onBack,
  onSave,
  saving,
}: Props) {
  function updateEntry(index: number, patch: Partial<ResearchedEntry>) {
    onResearchedChange(
      researched.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  return (
    <div>
      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        New Biomarker Research
      </div>
      <div className="space-y-4">
        {researched.map((entry, i) => (
          <div key={entry.vocabularyKey} className="border border-zinc-200 p-4">
            <div className="mb-2 text-xs font-semibold text-zinc-900">
              {entry.vocabularyKey}
            </div>
            <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
              Description
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => updateEntry(i, { description: e.target.value })}
              rows={2}
              className="mb-3 w-full border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900"
            />
            <div className="flex gap-4">
              <div>
                <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
                  Ref Min
                </label>
                <input
                  type="number"
                  step="any"
                  value={entry.referenceRange.min}
                  onChange={(e) =>
                    updateEntry(i, {
                      referenceRange: {
                        ...entry.referenceRange,
                        min: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9px] tracking-[1px] text-zinc-500 uppercase">
                  Ref Max
                </label>
                <input
                  type="number"
                  step="any"
                  value={entry.referenceRange.max}
                  onChange={(e) =>
                    updateEntry(i, {
                      referenceRange: {
                        ...entry.referenceRange,
                        max: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border border-zinc-200 px-5 py-2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-zinc-900 px-5 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Reading"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run `bun run check` and verify it passes**

- [ ] **Step 3: Commit**

```bash
git add components/admin/step-review-research.tsx
git commit -m "feat: add step-review-research component"
```

---

### Task 7: Wire research step into upload wizard

**Files:**

- Modify: `components/admin/upload-wizard.tsx`

This is the integration task. The wizard needs:

1. Updated step indicator: `["Extract", "Map", "Research"]` when new entries exist, `["Extract", "Map"]` otherwise
2. After review-mapping, if any mappings have `isNew: true`, call `/api/research` with only those entries
3. New `review-research` step where user edits descriptions/ranges
4. When saving, merge researched data back into the new vocabulary entries

- [ ] **Step 1: Update imports and step labels**

Add to imports at top of `upload-wizard.tsx`:

```typescript
import type {
  ExtractResponse,
  ExtractedVariable,
  MapResponse,
  MappedVariable,
  ResearchResponse,
  ResearchedEntry,
  SaveReadingRequest,
  WizardState,
} from "@/types/wizard";
import { StepReviewResearch } from "@/components/admin/step-review-research";
```

- [ ] **Step 2: Update StepIndicator to be dynamic**

Replace the `STEP_LABELS` constant and `StepIndicator` component:

```tsx
function StepIndicator({
  active,
  hasNewEntries,
}: {
  active: number;
  hasNewEntries: boolean;
}) {
  const labels = hasNewEntries
    ? ["Extract", "Map", "Research"]
    : ["Extract", "Map"];
  return (
    <div className="mb-6 flex gap-4 text-[9px] tracking-[2px] uppercase">
      {labels.map((label, i) => (
        <span
          key={label}
          className={
            i === active ? "font-semibold text-zinc-900" : "text-zinc-400"
          }
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add `handleResearch` callback**

After the existing `handleMap` callback, add:

```typescript
const handleResearch = useCallback(
  async (date: string, mappings: MappedVariable[], pdfUrl: string) => {
    const newEntries = mappings
      .filter((m) => m.isNew)
      .map((m) => ({
        vocabularyKey: m.vocabularyKey,
        label: m.label,
        unit: m.convertedUnit,
        referenceRange: m.referenceRange ?? { min: 0, max: 0 },
      }));

    if (newEntries.length === 0) {
      handleSave(date, mappings, [], pdfUrl);
      return;
    }

    setState({ step: "researching", pdfUrl, date, mappings });

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEntries }),
      });
      if (!res.ok) throw new Error("Research failed");
      const data = (await res.json()) as ResearchResponse;
      setState({
        step: "review-research",
        pdfUrl,
        date,
        mappings,
        researched: data.entries,
      });
    } catch (e) {
      setState({
        step: "error",
        message: e instanceof Error ? e.message : "Research failed",
        returnTo: { step: "review-mapping", pdfUrl, date, mappings },
      });
    }
  },
  [handleSave],
);
```

- [ ] **Step 4: Update `handleSave` to accept researched entries**

Update `handleSave` to merge researched descriptions and ranges into new vocabulary:

```typescript
const handleSave = useCallback(
  async (
    date: string,
    mappings: MappedVariable[],
    researched: ResearchedEntry[],
    pdfUrl: string,
  ) => {
    setState({ step: "saving", pdfUrl, date, mappings });

    const researchByKey = new Map(researched.map((r) => [r.vocabularyKey, r]));

    const newVocabulary: VocabularyEntry[] = mappings
      .filter((m) => m.isNew)
      .map((m) => {
        const research = researchByKey.get(m.vocabularyKey);
        return {
          key: m.vocabularyKey,
          label: m.label,
          unit: m.convertedUnit,
          referenceRange: research?.referenceRange ??
            m.referenceRange ?? { min: 0, max: 0 },
          description: research?.description ?? null,
        };
      });

    const allVocab = [...vocabulary, ...newVocabulary];
    const measurements: SaveReadingRequest["measurements"] = mappings.map(
      (m) => {
        const entry = allVocab.find((v) => v.key === m.vocabularyKey);
        const range = entry?.referenceRange ?? { min: 0, max: 0 };
        return {
          vocabularyKey: m.vocabularyKey,
          value: m.convertedValue,
          unit: m.convertedUnit,
          status: deriveStatus(m.convertedValue, range),
        };
      },
    );

    const body: SaveReadingRequest = {
      date,
      source: fileName,
      measurements,
      newVocabulary,
    };

    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setState({ step: "done" });
    } catch (e) {
      setState({
        step: "error",
        message: e instanceof Error ? e.message : "Save failed",
        returnTo: { step: "review-mapping", pdfUrl, date, mappings },
      });
    }
  },
  [vocabulary, fileName],
);
```

Note: `handleSave` must be defined before `handleResearch` since `handleResearch` depends on it.

- [ ] **Step 5: Compute `hasNewEntries` for step indicator**

Add a derived value in the component body (before the JSX return):

```typescript
const hasNewEntries =
  (state.step === "review-mapping" ||
    state.step === "researching" ||
    state.step === "review-research" ||
    state.step === "saving") &&
  "mappings" in state &&
  state.mappings.some((m) => m.isNew);
```

- [ ] **Step 6: Update JSX to wire everything together**

Update `StepIndicator` calls to pass `hasNewEntries`:

```tsx
<StepIndicator active={0} hasNewEntries={false} />  // for review-extraction
<StepIndicator active={1} hasNewEntries={hasNewEntries} />  // for mapping, review-mapping
```

Change the `onSave` in `StepReviewMapping` to call `handleResearch` instead:

```tsx
onSave={() => handleResearch(state.date, state.mappings, state.pdfUrl)}
```

Add the researching and review-research renders:

```tsx
{
  state.step === "researching" && (
    <>
      <StepIndicator active={2} hasNewEntries={true} />
      <p className="text-xs text-zinc-500">Researching new biomarkers...</p>
    </>
  );
}

{
  state.step === "review-research" && (
    <>
      <StepIndicator active={2} hasNewEntries={true} />
      <StepReviewResearch
        researched={state.researched}
        onResearchedChange={(researched) => setState({ ...state, researched })}
        onBack={() =>
          setState({
            step: "review-mapping",
            pdfUrl: state.pdfUrl,
            date: state.date,
            mappings: state.mappings,
          })
        }
        onSave={() =>
          handleSave(state.date, state.mappings, state.researched, state.pdfUrl)
        }
        saving={false}
      />
    </>
  );
}
```

Update the saving block to also show the correct step indicator:

```tsx
{
  state.step === "saving" && (
    <>
      <StepIndicator
        active={hasNewEntries ? 2 : 1}
        hasNewEntries={hasNewEntries}
      />
      <p className="text-xs text-zinc-500">Saving reading...</p>
    </>
  );
}
```

- [ ] **Step 7: Run `bun run check` and verify it passes**

- [ ] **Step 8: Commit**

```bash
git add components/admin/upload-wizard.tsx
git commit -m "feat: wire research step into upload wizard"
```

---

### Task 8: Run migration on remote D1

**Files:** None (infrastructure)

- [ ] **Step 1: Run the ALTER TABLE on remote D1**

```bash
bunx wrangler d1 execute bloodwork-db --remote --command="ALTER TABLE vocabulary ADD COLUMN description TEXT"
```

- [ ] **Step 2: Deploy**

```bash
bun run deploy
```

- [ ] **Step 3: Commit any deploy-related changes if needed**
