# Upload Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-shot PDF upload with a two-step wizard that lets the admin review AI-extracted variables and vocabulary mappings before saving to D1.

**Architecture:** Single-page wizard at `/admin/upload` with discriminated union state machine. Two Gemini agentic calls (extract → map) with JSON context passed client-side. Three API endpoints: extract (Gemini), map (Gemini), readings (D1 write). Two-panel layout with PDF preview on the right.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Gemini 2.5 Flash via Vertex AI, Cloudflare D1

**Spec:** `docs/superpowers/specs/2026-03-29-upload-wizard-design.md`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `types/wizard.ts` | Wizard-specific types: `ExtractedVariable`, `MappedVariable`, `WizardState`, API request/response types |
| `prompts/extract-variables.txt` | Simplified Gemini prompt for PDF variable extraction (date + label/value/unit only) |
| `prompts/map-variables.txt` | Gemini prompt for vocabulary fuzzy-matching and unit conversion |
| `app/api/extract/route.ts` | Rewrite: PDF → Gemini extraction → JSON response (no persistence) |
| `app/api/map/route.ts` | New: variables + vocabulary → Gemini mapping → JSON response |
| `app/api/readings/route.ts` | New: save reading + new vocabulary to D1 atomically |
| `app/admin/upload/page.tsx` | Wizard page component with state machine |
| `components/admin/upload-wizard.tsx` | Main wizard component: state machine, two-panel layout |
| `components/admin/step-upload.tsx` | Upload step: drag-and-drop PDF upload |
| `components/admin/step-review-extraction.tsx` | Step 1: editable table of extracted variables |
| `components/admin/step-review-mapping.tsx` | Step 2: mapping table with vocabulary dropdowns |
| `lib/status.ts` | `deriveStatus()` pure function for value → status derivation |
| `lib/status.test.ts` | Tests for status derivation |
| `lib/gemini.ts` | Shared Gemini caller extracted from current extract route |

### Modified files

| File | Change |
|---|---|
| `middleware.ts` | Add `/api/map/:path*` and `/api/readings/:path*` to matcher |
| `app/admin/layout.tsx` | Add "Upload" nav item pointing to `/admin/upload` |
| `types/bloodwork.ts` | Remove old `ExtractedMeasurement`, `ExtractedReading`, `MergeResult` types |
| `specs/architecture.md` | Update route table and API routes |

### Deleted files

| File | Reason |
|---|---|
| `components/admin/pdf-uploader.tsx` | Replaced by wizard components |
| `prompts/extract.txt` | Replaced by `prompts/extract-variables.txt` |
| `prompts/vocabulary-merge.txt` | Replaced by `prompts/map-variables.txt` |

---

## Task 1: Types and status derivation

**Files:**
- Create: `types/wizard.ts`
- Create: `lib/status.ts`
- Create: `lib/status.test.ts`
- Modify: `types/bloodwork.ts`

- [ ] **Step 1: Write status derivation tests**

Create `lib/status.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { deriveStatus } from "@/lib/status";

describe("deriveStatus", () => {
  it("returns normal when value is within range", () => {
    expect(deriveStatus(85, { min: 70, max: 100 })).toBe("normal");
  });

  it("returns low when value is below min", () => {
    expect(deriveStatus(65, { min: 70, max: 100 })).toBe("low");
  });

  it("returns high when value is above max", () => {
    expect(deriveStatus(110, { min: 70, max: 100 })).toBe("high");
  });

  it("returns normal when value equals min", () => {
    expect(deriveStatus(70, { min: 70, max: 100 })).toBe("normal");
  });

  it("returns normal when value equals max", () => {
    expect(deriveStatus(100, { min: 70, max: 100 })).toBe("normal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- lib/status.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write status derivation**

Create `lib/status.ts`:

```typescript
import type { Status } from "@/types/bloodwork";

export function deriveStatus(
  value: number,
  referenceRange: { min: number; max: number },
): Status {
  if (value < referenceRange.min) return "low";
  if (value > referenceRange.max) return "high";
  return "normal";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- lib/status.test.ts`
Expected: PASS

- [ ] **Step 5: Create wizard types**

Create `types/wizard.ts`:

```typescript
import type { VocabularyEntry } from "@/types/bloodwork";

export type ExtractedVariable = {
  label: string;
  value: number;
  unit: string;
};

export type MappedVariable = {
  label: string;
  originalValue: number;
  originalUnit: string;
  vocabularyKey: string;
  convertedValue: number;
  convertedUnit: string;
  isNew: boolean;
  referenceRange?: { min: number; max: number };
};

// API response types

export type ExtractResponse = {
  date: string;
  variables: ExtractedVariable[];
};

export type MapRequest = {
  variables: ExtractedVariable[];
  vocabulary: VocabularyEntry[];
};

export type MapResponse = {
  mappings: MappedVariable[];
};

export type SaveReadingRequest = {
  date: string;
  source: string;
  measurements: {
    vocabularyKey: string;
    value: number;
    unit: string;
    status: "normal" | "high" | "low";
  }[];
  newVocabulary: VocabularyEntry[];
};

export type SaveReadingResponse = {
  readingId: string;
};

// Wizard state machine

export type WizardState =
  | { step: "upload" }
  | { step: "extracting"; pdfUrl: string }
  | {
      step: "review-extraction";
      pdfUrl: string;
      date: string;
      variables: ExtractedVariable[];
    }
  | {
      step: "mapping";
      pdfUrl: string;
      date: string;
      variables: ExtractedVariable[];
    }
  | {
      step: "review-mapping";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
    }
  | {
      step: "saving";
      pdfUrl: string;
      date: string;
      mappings: MappedVariable[];
    }
  | { step: "done" }
  | {
      step: "error";
      message: string;
      returnTo: Exclude<WizardState, { step: "error" }>;
    };
```

- [ ] **Step 6: Remove old extraction types from bloodwork.ts**

In `types/bloodwork.ts`, delete the `ExtractedMeasurement`, `ExtractedReading`, and `MergeResult` types and their comments (lines 25–45). Keep everything else.

- [ ] **Step 7: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add types/wizard.ts lib/status.ts lib/status.test.ts types/bloodwork.ts
git commit -m "feat: add wizard types and status derivation"
```

---

## Task 2: Gemini helper and extract prompt

**Files:**
- Create: `lib/gemini.ts`
- Create: `prompts/extract-variables.txt`

- [ ] **Step 1: Extract shared Gemini caller**

Create `lib/gemini.ts` — extracted from the current `app/api/extract/route.ts`:

```typescript
import { type Part, VertexAI } from "@google-cloud/vertexai";
import assert from "node:assert";

function getModel() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  assert(project, "GOOGLE_CLOUD_PROJECT is required");
  const vertexAI = new VertexAI({
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
  });
  return vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function callGemini(
  prompt: string,
  pdfBase64?: string,
): Promise<string> {
  const parts: Part[] = pdfBase64
    ? [
        { text: prompt },
        { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      ]
    : [{ text: prompt }];

  const model = getModel();
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  assert(text, "Gemini returned no text");
  return text;
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
```

- [ ] **Step 2: Write extract prompt**

Create `prompts/extract-variables.txt`:

```
Extract all blood test results from this medical PDF report.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "date": "YYYY-MM-DD",
  "variables": [
    {
      "label": "Test Name As Written",
      "value": 98.0,
      "unit": "mg/dL"
    }
  ]
}

Rules:
- "date": the specimen collection date from the report in YYYY-MM-DD format; if not found, use today's date
- "label": exact test name as it appears in the report
- "value": numeric value only
- "unit": unit string as written in the report
- Include every individual test result; do not omit any
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/gemini.ts prompts/extract-variables.txt
git commit -m "feat: extract shared Gemini helper and new extract prompt"
```

---

## Task 3: Map prompt

**Files:**
- Create: `prompts/map-variables.txt`

- [ ] **Step 1: Write map prompt**

Create `prompts/map-variables.txt`:

```
You are given extracted blood test variables and an existing vocabulary of known biomarkers.

EXISTING VOCABULARY:
{{VOCABULARY}}

EXTRACTED VARIABLES:
{{VARIABLES}}

Your task:
1. For each extracted variable, find the best matching vocabulary entry by label (use fuzzy/case-insensitive matching — e.g. "Hba1c" matches "HbA1c", "WBC" matches "White Blood Cells").
2. If the extracted unit differs from the vocabulary unit, convert the value to the vocabulary's unit.
3. For variables with no vocabulary match, create a new entry: derive a snake_case key from the label, keep the original unit and value, and propose a reference range based on medical knowledge.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:

{
  "mappings": [
    {
      "label": "Original Label From PDF",
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

Rules:
- "label": the exact label from the extracted variables
- "originalValue" / "originalUnit": copied from the extracted variable
- "vocabularyKey": the matching vocabulary key, or a new snake_case key for unmatched variables
- "convertedValue": the value converted to the vocabulary's unit (or same value if units match or it's a new entry)
- "convertedUnit": the vocabulary's unit (or original unit for new entries)
- "isNew": true only for variables that don't match any existing vocabulary entry
- "referenceRange": required only when "isNew" is true; propose a standard medical reference range
- Maintain the same order as the input variables
```

- [ ] **Step 2: Commit**

```bash
git add prompts/map-variables.txt
git commit -m "feat: add vocabulary mapping prompt"
```

---

## Task 4: API route — POST /api/extract

**Files:**
- Modify: `app/api/extract/route.ts` (full rewrite)

- [ ] **Step 1: Rewrite extract route**

Replace the entire contents of `app/api/extract/route.ts`:

```typescript
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import type { ExtractResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("pdf");
  assert(file instanceof File, "No PDF file provided");

  const prompt = readFileSync(
    join(process.cwd(), "prompts", "extract-variables.txt"),
    "utf-8",
  );
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const text = await callGemini(prompt, base64);
  const result = parseGeminiJson<ExtractResponse>(text);

  assert(result.date, "No date extracted");
  assert(result.variables.length > 0, "No variables extracted");

  return Response.json(result);
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/extract/route.ts
git commit -m "feat: rewrite extract route for wizard (no persistence)"
```

---

## Task 5: API route — POST /api/map

**Files:**
- Create: `app/api/map/route.ts`

- [ ] **Step 1: Write map route**

Create `app/api/map/route.ts`:

```typescript
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { callGemini, parseGeminiJson } from "@/lib/gemini";
import type { MapRequest, MapResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const body = (await request.json()) as MapRequest;
  assert(body.variables.length > 0, "No variables provided");

  const template = readFileSync(
    join(process.cwd(), "prompts", "map-variables.txt"),
    "utf-8",
  );
  const prompt = template
    .replace("{{VOCABULARY}}", JSON.stringify(body.vocabulary, null, 2))
    .replace("{{VARIABLES}}", JSON.stringify(body.variables, null, 2));

  const text = await callGemini(prompt);
  const result = parseGeminiJson<MapResponse>(text);

  assert(result.mappings.length > 0, "No mappings returned");

  return Response.json(result);
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/map/route.ts
git commit -m "feat: add map API route for vocabulary matching"
```

---

## Task 6: API route — POST /api/readings

**Files:**
- Create: `app/api/readings/route.ts`

- [ ] **Step 1: Write readings route**

Create `app/api/readings/route.ts`:

```typescript
import assert from "node:assert";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { SaveReadingRequest, SaveReadingResponse } from "@/types/wizard";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await request.json()) as SaveReadingRequest;

  assert(body.measurements.length > 0, "No measurements");

  const readingId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];

  // Insert new vocabulary entries
  for (const entry of body.newVocabulary) {
    statements.push(
      db
        .prepare(
          "INSERT INTO vocabulary (key, label, unit, reference_min, reference_max) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          entry.key,
          entry.label,
          entry.unit,
          entry.referenceRange.min,
          entry.referenceRange.max,
        ),
    );
  }

  // Insert reading
  statements.push(
    db
      .prepare("INSERT INTO readings (id, date, source) VALUES (?, ?, ?)")
      .bind(readingId, body.date, body.source),
  );

  // Insert measurements
  for (const m of body.measurements) {
    statements.push(
      db
        .prepare(
          "INSERT INTO measurements (id, reading_id, vocabulary_key, value, unit, status) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          readingId,
          m.vocabularyKey,
          m.value,
          m.unit,
          m.status,
        ),
    );
  }

  await db.batch(statements);

  return Response.json({ readingId } satisfies SaveReadingResponse);
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/readings/route.ts
git commit -m "feat: add readings API route for atomic D1 save"
```

---

## Task 7: Update middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add new routes to middleware matcher**

In `middleware.ts`, update the `config.matcher` array to add the two new API routes:

```typescript
export const config = {
  matcher: [
    "/admin/:path+",
    "/api/extract/:path*",
    "/api/map/:path*",
    "/api/readings/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
  ],
};
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect map and readings API routes with auth"
```

---

## Task 8: Upload step component

**Files:**
- Create: `components/admin/step-upload.tsx`

- [ ] **Step 1: Write upload step**

Create `components/admin/step-upload.tsx`:

```tsx
"use client";

import { useRef } from "react";

export function StepUpload({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center border border-dashed border-zinc-300 p-16"
    >
      <p className="mb-4 text-xs text-zinc-500">
        Drop a PDF here or click to upload
      </p>
      <label className="cursor-pointer border border-zinc-900 px-4 py-1.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white">
        Choose File
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/admin/step-upload.tsx
git commit -m "feat: add upload step component"
```

---

## Task 9: Review extraction step component

**Files:**
- Create: `components/admin/step-review-extraction.tsx`

- [ ] **Step 1: Write review extraction step**

Create `components/admin/step-review-extraction.tsx`:

```tsx
"use client";

import type { ExtractedVariable } from "@/types/wizard";

type Props = {
  date: string;
  variables: ExtractedVariable[];
  onDateChange: (date: string) => void;
  onVariablesChange: (variables: ExtractedVariable[]) => void;
  onNext: () => void;
};

export function StepReviewExtraction({
  date,
  variables,
  onDateChange,
  onVariablesChange,
  onNext,
}: Props) {
  function updateVariable(
    index: number,
    field: keyof ExtractedVariable,
    raw: string,
  ) {
    const updated = variables.map((v, i) => {
      if (i !== index) return v;
      if (field === "value") return { ...v, value: parseFloat(raw) || 0 };
      return { ...v, [field]: raw };
    });
    onVariablesChange(updated);
  }

  function deleteVariable(index: number) {
    onVariablesChange(variables.filter((_, i) => i !== index));
  }

  function addVariable() {
    onVariablesChange([...variables, { label: "", value: 0, unit: "" }]);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
          Test Date
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="border border-zinc-200 px-2.5 py-1.5 text-xs"
        />
      </div>

      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        Extracted Variables
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="pb-2 pr-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Label
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Value
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Unit
            </th>
            <th className="w-8 pb-2 pl-2" />
          </tr>
        </thead>
        <tbody>
          {variables.map((v, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className="py-2 pr-2">
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(i, "label", e.target.value)}
                  className="w-full border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  step="any"
                  value={v.value}
                  onChange={(e) => updateVariable(i, "value", e.target.value)}
                  className="w-20 border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  value={v.unit}
                  onChange={(e) => updateVariable(i, "unit", e.target.value)}
                  className="w-20 border border-zinc-200 px-1.5 py-1 text-xs"
                />
              </td>
              <td className="py-2 pl-2 text-center">
                <button
                  type="button"
                  onClick={() => deleteVariable(i)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addVariable}
        className="mt-3 border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700"
      >
        + Add variable
      </button>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={variables.length === 0}
          className="bg-zinc-900 px-5 py-2 text-xs text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          Next: Map Variables &rarr;
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/admin/step-review-extraction.tsx
git commit -m "feat: add extraction review step component"
```

---

## Task 10: Review mapping step component

**Files:**
- Create: `components/admin/step-review-mapping.tsx`

- [ ] **Step 1: Write review mapping step**

Create `components/admin/step-review-mapping.tsx`:

```tsx
"use client";

import type { VocabularyEntry } from "@/types/bloodwork";
import type { MappedVariable } from "@/types/wizard";

type Props = {
  mappings: MappedVariable[];
  vocabulary: VocabularyEntry[];
  onMappingsChange: (mappings: MappedVariable[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
};

export function StepReviewMapping({
  mappings,
  vocabulary,
  onMappingsChange,
  onBack,
  onSave,
  saving,
}: Props) {
  function updateMapping(index: number, newKey: string) {
    const updated = mappings.map((m, i) => {
      if (i !== index) return m;
      if (newKey === "__new__") {
        return { ...m, vocabularyKey: m.label.toLowerCase().replace(/\s+/g, "_"), isNew: true };
      }
      const entry = vocabulary.find((v) => v.key === newKey);
      if (!entry) return m;
      return {
        ...m,
        vocabularyKey: entry.key,
        convertedUnit: entry.unit,
        isNew: false,
      };
    });
    onMappingsChange(updated);
  }

  return (
    <div>
      <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
        Variable Mapping
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-left">
            <th className="pb-2 pr-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Extracted
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              &rarr;
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Maps To
            </th>
            <th className="px-2 pb-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Value
            </th>
            <th className="pb-2 pl-2 text-[9px] font-semibold tracking-[1px] text-zinc-500 uppercase">
              Unit
            </th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, i) => (
            <tr
              key={i}
              className={`border-b border-zinc-100 ${m.isNew ? "bg-stone-50" : ""}`}
            >
              <td className="py-2 pr-2 text-zinc-500">
                {m.label} ({m.originalValue} {m.originalUnit})
              </td>
              <td className="px-2 py-2 text-zinc-400">&rarr;</td>
              <td className="px-2 py-2">
                {m.isNew && (
                  <span className="mr-1 border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[9px] tracking-[1px] text-zinc-500 uppercase">
                    New
                  </span>
                )}
                <select
                  value={m.isNew ? "__new__" : m.vocabularyKey}
                  onChange={(e) => updateMapping(i, e.target.value)}
                  className="border border-zinc-200 px-1.5 py-1 text-xs"
                >
                  {vocabulary.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                  <option value="__new__">+ New entry</option>
                </select>
              </td>
              <td className="px-2 py-2 font-semibold">{m.convertedValue}</td>
              <td className="py-2 pl-2 text-zinc-500">{m.convertedUnit}</td>
            </tr>
          ))}
        </tbody>
      </table>

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

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/admin/step-review-mapping.tsx
git commit -m "feat: add mapping review step component"
```

---

## Task 11: Main wizard component

**Files:**
- Create: `components/admin/upload-wizard.tsx`

- [ ] **Step 1: Write the wizard component**

Create `components/admin/upload-wizard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { VocabularyEntry } from "@/types/bloodwork";
import type {
  ExtractResponse,
  ExtractedVariable,
  MapResponse,
  MappedVariable,
  SaveReadingRequest,
  WizardState,
} from "@/types/wizard";
import { deriveStatus } from "@/lib/status";

import { StepUpload } from "@/components/admin/step-upload";
import { StepReviewExtraction } from "@/components/admin/step-review-extraction";
import { StepReviewMapping } from "@/components/admin/step-review-mapping";

const STEP_LABELS = ["Extract", "Map"] as const;

function StepIndicator({ active }: { active: 0 | 1 }) {
  return (
    <div className="mb-6 flex gap-4 text-[9px] tracking-[2px] uppercase">
      {STEP_LABELS.map((label, i) => (
        <span
          key={label}
          className={i === active ? "font-semibold text-zinc-900" : "text-zinc-400"}
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

export function UploadWizard() {
  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const didFetchVocab = useRef(false);

  useEffect(() => {
    if (didFetchVocab.current) return;
    didFetchVocab.current = true;
    fetch("/api/data")
      .then((r) => r.json() as Promise<{ vocabulary: { entries: VocabularyEntry[] } }>)
      .then((data) => setVocabulary(data.vocabulary.entries));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const pdfUrl = URL.createObjectURL(file);
    setFileName(file.name);
    setState({ step: "extracting", pdfUrl });

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Extraction failed");
      const data = (await res.json()) as ExtractResponse;
      setState({
        step: "review-extraction",
        pdfUrl,
        date: data.date,
        variables: data.variables,
      });
    } catch (e) {
      setState({
        step: "error",
        message: e instanceof Error ? e.message : "Extraction failed",
        returnTo: { step: "upload" },
      });
    }
  }, []);

  const handleMap = useCallback(
    async (date: string, variables: ExtractedVariable[], pdfUrl: string) => {
      setState({ step: "mapping", pdfUrl, date, variables });

      try {
        const res = await fetch("/api/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variables, vocabulary }),
        });
        if (!res.ok) throw new Error("Mapping failed");
        const data = (await res.json()) as MapResponse;
        setState({
          step: "review-mapping",
          pdfUrl,
          date,
          mappings: data.mappings,
        });
      } catch (e) {
        setState({
          step: "error",
          message: e instanceof Error ? e.message : "Mapping failed",
          returnTo: { step: "review-extraction", pdfUrl, date, variables },
        });
      }
    },
    [vocabulary],
  );

  const handleSave = useCallback(
    async (date: string, mappings: MappedVariable[], pdfUrl: string) => {
      setState({ step: "saving", pdfUrl, date, mappings });

      const newVocabulary: VocabularyEntry[] = mappings
        .filter((m) => m.isNew)
        .map((m) => ({
          key: m.vocabularyKey,
          label: m.label,
          unit: m.convertedUnit,
          referenceRange: m.referenceRange ?? { min: 0, max: 0 },
        }));

      // Build measurements with derived status
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

  // Determine if we should show PDF preview
  const pdfUrl =
    state.step !== "upload" && state.step !== "done" && state.step !== "error"
      ? state.pdfUrl
      : state.step === "error" &&
          "pdfUrl" in state.returnTo
        ? (state.returnTo as { pdfUrl: string }).pdfUrl
        : null;

  return (
    <div className="flex gap-0">
      {/* Left panel */}
      <div className={`flex-1 ${pdfUrl ? "md:border-r md:border-zinc-200 md:pr-6" : ""}`}>
        {state.step === "upload" && <StepUpload onUpload={handleUpload} />}

        {state.step === "extracting" && (
          <p className="text-xs text-zinc-500">Extracting variables from PDF...</p>
        )}

        {state.step === "review-extraction" && (
          <>
            <StepIndicator active={0} />
            <StepReviewExtraction
              date={state.date}
              variables={state.variables}
              onDateChange={(date) =>
                setState({ ...state, date })
              }
              onVariablesChange={(variables) =>
                setState({ ...state, variables })
              }
              onNext={() => handleMap(state.date, state.variables, state.pdfUrl)}
            />
          </>
        )}

        {state.step === "mapping" && (
          <>
            <StepIndicator active={1} />
            <p className="text-xs text-zinc-500">Mapping variables to vocabulary...</p>
          </>
        )}

        {state.step === "review-mapping" && (
          <>
            <StepIndicator active={1} />
            <StepReviewMapping
              mappings={state.mappings}
              vocabulary={vocabulary}
              onMappingsChange={(mappings) =>
                setState({ ...state, mappings })
              }
              onBack={() =>
                setState({
                  step: "review-extraction",
                  pdfUrl: state.pdfUrl,
                  date: state.date,
                  variables: state.mappings.map((m) => ({
                    label: m.label,
                    value: m.originalValue,
                    unit: m.originalUnit,
                  })),
                })
              }
              onSave={() => handleSave(state.date, state.mappings, state.pdfUrl)}
              saving={false}
            />
          </>
        )}

        {state.step === "saving" && (
          <>
            <StepIndicator active={1} />
            <p className="text-xs text-zinc-500">Saving reading...</p>
          </>
        )}

        {state.step === "done" && (
          <div className="text-center">
            <p className="mb-4 text-xs text-zinc-500">Reading saved successfully.</p>
            <button
              type="button"
              onClick={() => setState({ step: "upload" })}
              className="border border-zinc-900 px-4 py-1.5 text-xs text-zinc-900 hover:bg-zinc-900 hover:text-white"
            >
              Upload Another
            </button>
          </div>
        )}

        {state.step === "error" && (
          <div>
            <p className="mb-4 text-xs text-red-400">{state.message}</p>
            <button
              type="button"
              onClick={() => setState(state.returnTo)}
              className="border border-zinc-200 px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Right panel: PDF preview (desktop only) */}
      {pdfUrl && (
        <div className="hidden flex-1 pl-6 md:block">
          <div className="mb-2 text-[9px] tracking-[2px] text-zinc-500 uppercase">
            PDF Preview
          </div>
          <iframe
            src={pdfUrl}
            className="h-[600px] w-full border border-zinc-200"
            title="PDF preview"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/admin/upload-wizard.tsx
git commit -m "feat: add main upload wizard component with state machine"
```

---

## Task 12: Wizard page and navigation

**Files:**
- Create: `app/admin/upload/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create wizard page**

Create `app/admin/upload/page.tsx`:

```tsx
import { UploadWizard } from "@/components/admin/upload-wizard";

export default function UploadPage() {
  return (
    <section>
      <h2 className="mb-4 text-[9px] tracking-[2px] text-zinc-400 uppercase">
        Upload Reading
      </h2>
      <UploadWizard />
    </section>
  );
}
```

- [ ] **Step 2: Add Upload nav item**

In `app/admin/layout.tsx`, update the `navItems` array:

```typescript
const navItems = [
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/vocabulary", label: "Vocabulary" },
  { href: "/admin/supplements", label: "Supplements" },
] as const;
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/admin/upload/page.tsx app/admin/layout.tsx
git commit -m "feat: add upload wizard page and nav item"
```

---

## Task 13: Clean up old code

**Files:**
- Delete: `components/admin/pdf-uploader.tsx`
- Delete: `prompts/extract.txt`
- Delete: `prompts/vocabulary-merge.txt`
- Modify: `app/admin/data/page.tsx`

- [ ] **Step 1: Remove PdfUploader from data page**

In `app/admin/data/page.tsx`:
- Remove the `import { PdfUploader }` line
- Remove the entire `<section>` block containing `<PdfUploader onSuccess={refresh} />`

The page should only show the Readings section and the Export Markdown button.

- [ ] **Step 2: Delete old files**

```bash
rm components/admin/pdf-uploader.tsx prompts/extract.txt prompts/vocabulary-merge.txt
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old PDF upload flow and prompts"
```

---

## Task 14: Update specs

**Files:**
- Modify: `specs/architecture.md`

- [ ] **Step 1: Update architecture spec**

In `specs/architecture.md`:

Update the **Route Structure** table to add:

```
| `/admin/upload`    | Auth   | Upload wizard                   |
```

Update the **API Routes** table — replace the extract row and add map + readings:

```
| POST   | `/api/extract`     | PDF upload → Gemini variable extraction |
| POST   | `/api/map`         | Variables → Gemini vocabulary mapping   |
| POST   | `/api/readings`    | Save reading + vocabulary to D1         |
```

Update the **Component Architecture** admin section:

```
- `components/admin/` — admin data management
  - `upload-wizard` — main wizard: state machine, two-panel layout
  - `step-upload` — PDF drag-and-drop upload
  - `step-review-extraction` — editable table of extracted variables
  - `step-review-mapping` — mapping table with vocabulary dropdowns
  - `readings-table` — tabular view of all readings
  - `vocabulary-editor` — edit test names, units, and ranges
  - `supplement-editor` — edit supplements with changelog
```

Update the **Data** section to remove JSON file references and note D1 is fully migrated:

```
## Data

D1 SQLite database with tables: `vocabulary`, `readings`, `measurements`, `supplements`, `supplement_changelog`.
```

Remove the line about keeping data in JSON files from **Architectural Constraints**.

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add specs/architecture.md
git commit -m "docs: update architecture spec for upload wizard"
```

---

## Task 15: Final validation

- [ ] **Step 1: Run full validation suite**

Run: `bun run check:full`
Expected: PASS — all formatting, lint, typecheck, tests, and production build succeed.

- [ ] **Step 2: Manual smoke test**

1. Run `bun dev`
2. Navigate to `/admin` → login
3. Click "Upload" in nav → see empty upload dropzone
4. Upload a blood test PDF → verify extraction spinner appears
5. Review extracted variables → edit a value → click Next
6. Review mappings → verify unit conversions → click Save
7. Navigate to Data page → verify reading appears
8. Navigate to Vocabulary page → verify any new entries appear
