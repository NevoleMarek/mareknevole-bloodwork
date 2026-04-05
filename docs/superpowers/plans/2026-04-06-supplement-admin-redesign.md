# Supplement Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the supplement admin page with an editable table, card-style add form, month picker for "since", and automatic changelog generation for edits.

**Architecture:** The supplement editor component gets a full rewrite with three row states (display, editing, removing). The add form becomes a stacked card layout below the table. The PUT API endpoint adds `startedAt` support. The dashboard display formats `YYYY-MM` dates.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Cloudflare D1

---

### Task 1: Update PUT API to support `startedAt` changes

The PUT endpoint currently doesn't accept or update `startedAt`. Add it so inline edits to the "since" field are persisted and changelog-tracked.

**Files:**
- Modify: `app/api/supplements/route.ts:54-99`

- [ ] **Step 1: Add `startedAt` to the PUT request type and diff logic**

In `app/api/supplements/route.ts`, update the PUT handler:

```typescript
export async function PUT(req: Request) {
  const { env } = await getCloudflareContext();
  const db = env.DB;
  const body = (await req.json()) as {
    id: string;
    name: string;
    dose: string;
    frequency: string;
    startedAt: string;
    changelogDate: string;
  };

  const old = await db
    .prepare("SELECT * FROM supplements WHERE id = ?")
    .bind(body.id)
    .first<{ name: string; dose: string; frequency: string; started_at: string }>();

  if (!old) return Response.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const changes: string[] = [];
  if (old.dose !== body.dose)
    changes.push(`Changed ${old.name} dose from ${old.dose} to ${body.dose}`);
  if (old.frequency !== body.frequency)
    changes.push(`Changed ${old.name} frequency to ${body.frequency}`);
  if (old.name !== body.name)
    changes.push(`Renamed ${old.name} to ${body.name}`);
  if (old.started_at !== body.startedAt)
    changes.push(`Changed ${body.name} start date to ${body.startedAt}`);

  await db
    .prepare(
      "UPDATE supplements SET name = ?, dose = ?, frequency = ?, started_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(body.name, body.dose, body.frequency, body.startedAt, now, body.id)
    .run();

  for (const desc of changes) {
    await db
      .prepare(
        "INSERT INTO supplement_changelog (id, date, description, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), body.changelogDate, desc, now)
      .run();
  }

  revalidatePath("/");

  return Response.json({ ok: true });
}
```

Note: also improve the dose changelog message to say "dose" explicitly (currently it just says "from X to Y").

- [ ] **Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/supplements/route.ts
git commit -m "feat: add startedAt support to PUT supplements endpoint"
```

---

### Task 2: Rewrite supplement editor with editable table and card-style add form

Full rewrite of `supplement-editor.tsx`. The component manages three row states via a discriminated union: display, editing, and removing.

**Files:**
- Rewrite: `components/admin/supplement-editor.tsx`

- [ ] **Step 1: Write the new supplement editor component**

Replace the entire contents of `components/admin/supplement-editor.tsx` with:

```tsx
"use client";

import { useState } from "react";
import type { Supplement } from "@/types/bloodwork";

type RowState =
  | { kind: "display" }
  | { kind: "editing"; name: string; dose: string; frequency: string; startedAt: string; changelogDate: string }
  | { kind: "removing"; changelogDate: string };

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function SupplementEditor({
  supplements,
  onRefresh,
}: {
  supplements: Supplement[];
  onRefresh: () => void;
}) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [form, setForm] = useState({
    name: "",
    dose: "",
    frequency: "daily",
    startedAt: "",
    changelogDate: today(),
  });

  function getRowState(id: string): RowState {
    return rowStates[id] ?? { kind: "display" };
  }

  function setRowState(id: string, state: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: state }));
  }

  async function handleSave(id: string) {
    const state = getRowState(id);
    if (state.kind !== "editing") return;

    await fetch("/api/supplements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: state.name,
        dose: state.dose,
        frequency: state.frequency,
        startedAt: state.startedAt,
        changelogDate: state.changelogDate,
      }),
    });
    setRowState(id, { kind: "display" });
    onRefresh();
  }

  async function handleRemove(id: string) {
    const state = getRowState(id);
    if (state.kind !== "removing") return;

    await fetch("/api/supplements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, changelogDate: state.changelogDate }),
    });
    onRefresh();
  }

  async function handleAdd() {
    await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      name: "",
      dose: "",
      frequency: "daily",
      startedAt: "",
      changelogDate: today(),
    });
    onRefresh();
  }

  return (
    <div className="space-y-6">
      {/* Active supplements table */}
      <div className="overflow-x-auto">
        <table className="mb-2 w-full text-[11px]">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
              <td className="pb-2"></td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => {
              const state = getRowState(s.id);

              if (state.kind === "editing") {
                return (
                  <tr key={s.id} className="border-t border-zinc-100 bg-stone-50">
                    <td colSpan={5} className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={state.name}
                          onChange={(e) => setRowState(s.id, { ...state, name: e.target.value })}
                          className="flex-1 border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <input
                          value={state.dose}
                          onChange={(e) => setRowState(s.id, { ...state, dose: e.target.value })}
                          className="w-24 border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <input
                          value={state.frequency}
                          onChange={(e) => setRowState(s.id, { ...state, frequency: e.target.value })}
                          className="w-24 border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <input
                          type="month"
                          value={state.startedAt}
                          onChange={(e) => setRowState(s.id, { ...state, startedAt: e.target.value })}
                          className="border border-zinc-200 bg-white px-2 py-1 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(s.id)}
                          className="border border-zinc-900 px-3 py-1 hover:bg-zinc-900 hover:text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRowState(s.id, { kind: "display" })}
                          className="px-3 py-1 text-zinc-400"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>Changelog date:</span>
                        <input
                          type="date"
                          value={state.changelogDate}
                          onChange={(e) => setRowState(s.id, { ...state, changelogDate: e.target.value })}
                          className="border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] outline-none"
                        />
                      </div>
                    </td>
                  </tr>
                );
              }

              if (state.kind === "removing") {
                return (
                  <tr key={s.id} className="border-t border-zinc-100 bg-red-50">
                    <td colSpan={5} className="py-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Remove <strong>{s.name}</strong>?
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span>Date:</span>
                          <input
                            type="date"
                            value={state.changelogDate}
                            onChange={(e) => setRowState(s.id, { ...state, changelogDate: e.target.value })}
                            className="border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] outline-none"
                          />
                        </span>
                        <span className="ml-auto flex gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
                            className="border border-red-400 px-3 py-0.5 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setRowState(s.id, { kind: "display" })}
                            className="text-zinc-400"
                          >
                            Cancel
                          </button>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={s.id} className="border-t border-zinc-100">
                  <td className="py-1.5">{s.name}</td>
                  <td className="py-1.5 text-zinc-500">{s.dose}</td>
                  <td className="py-1.5 text-zinc-500">{s.frequency}</td>
                  <td className="py-1.5 text-zinc-400">{formatMonth(s.startedAt)}</td>
                  <td className="py-1.5 text-right">
                    <span className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRowState(s.id, {
                            kind: "editing",
                            name: s.name,
                            dose: s.dose,
                            frequency: s.frequency,
                            startedAt: s.startedAt,
                            changelogDate: today(),
                          })
                        }
                        className="text-zinc-400 hover:text-zinc-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRowState(s.id, {
                            kind: "removing",
                            changelogDate: today(),
                          })
                        }
                        className="text-zinc-400 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add supplement form */}
      <div className="border border-zinc-200 p-4">
        <div className="mb-3 text-[9px] tracking-[2px] text-zinc-400 uppercase">
          Add Supplement
        </div>
        <div className="flex flex-col gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Creatine"
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Dose</span>
            <input
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              placeholder="e.g. 5g"
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Frequency</span>
            <input
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Since</span>
            <input
              type="month"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-[10px] text-zinc-500">Changelog date</span>
            <input
              type="date"
              value={form.changelogDate}
              onChange={(e) => setForm({ ...form, changelogDate: e.target.value })}
              className="flex-1 border border-zinc-200 px-2 py-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-[90px]"></span>
            <button
              type="button"
              onClick={handleAdd}
              className="border border-zinc-900 px-4 py-1 text-[10px] hover:bg-zinc-900 hover:text-white"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck and format**

Run: `bun run typecheck && bun run format`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/supplement-editor.tsx
git commit -m "feat: rewrite supplement editor with editable table and card-style add form"
```

---

### Task 3: Update dashboard supplement table to format YYYY-MM dates

The dashboard `SupplementTable` currently displays `startedAt` as raw text. Now that it's stored as `YYYY-MM`, format it as "Jan 2025".

**Files:**
- Modify: `components/dashboard/supplement-table.tsx`

- [ ] **Step 1: Add formatMonth helper and use it in the display**

Update `components/dashboard/supplement-table.tsx`:

```tsx
import type { Supplement } from "@/types/bloodwork";

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function SupplementTable({
  supplements,
}: {
  supplements: Supplement[];
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] tracking-[2px] text-zinc-400 uppercase">
              <td className="pb-2">Supplement</td>
              <td className="pb-2">Dose</td>
              <td className="pb-2">Frequency</td>
              <td className="pb-2">Since</td>
            </tr>
          </thead>
          <tbody className="text-zinc-900">
            {supplements.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100">
                <td className="py-2">{s.name}</td>
                <td className="py-2 text-zinc-600">{s.dose}</td>
                <td className="py-2 text-zinc-600">{s.frequency}</td>
                <td className="py-2 text-zinc-500">{formatMonth(s.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/supplement-table.tsx
git commit -m "feat: format YYYY-MM supplement dates as readable month+year on dashboard"
```

---

### Task 4: Migrate existing started_at data

Existing `started_at` values are freeform text (e.g. "Jan 2025"). Convert them to `YYYY-MM` format.

**Files:**
- None (SQL migration run manually)

- [ ] **Step 1: Check current values**

Run against remote D1:
```bash
bunx wrangler d1 execute bloodwork-db --remote --command="SELECT id, name, started_at FROM supplements WHERE stopped_at IS NULL"
```

Review the output to see what freeform values exist.

- [ ] **Step 2: Write and run migration SQL**

For each row, convert the freeform date. Common pattern: "Mon YYYY" → "YYYY-MM". Example migration (adjust based on actual data from step 1):

```bash
bunx wrangler d1 execute bloodwork-db --remote --command="UPDATE supplements SET started_at = strftime('%Y-%m', started_at || ' 01') WHERE started_at LIKE '____-__' = 0"
```

If automatic conversion doesn't work for all values, update them individually:

```bash
bunx wrangler d1 execute bloodwork-db --remote --command="UPDATE supplements SET started_at = '2025-01' WHERE started_at = 'Jan 2025'"
```

Repeat for each distinct value found in step 1.

- [ ] **Step 3: Verify migration**

```bash
bunx wrangler d1 execute bloodwork-db --remote --command="SELECT id, name, started_at FROM supplements WHERE stopped_at IS NULL"
```

Confirm all values are now in `YYYY-MM` format.

---

### Task 5: Run full validation and final commit

**Files:**
- All modified files from tasks 1-3

- [ ] **Step 1: Run full check**

Run: `bun run check`
Expected: All passes (format, lint, typecheck, tests)

- [ ] **Step 2: Run full build**

Run: `bun run check:full`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test**

Run: `bun run dev`

1. Open `/admin/supplements`
2. Verify the active supplements table shows with Edit/Remove buttons
3. Click Edit on a row — verify inputs appear with month picker and changelog date
4. Click Cancel — verify it reverts
5. Click Remove — verify inline confirmation with date picker
6. Click Cancel — verify it reverts
7. Verify the add form is visible below the table with month picker for "since"
8. Add a test supplement, verify it appears in table and changelog
9. Edit its dose, verify changelog entry is auto-generated
10. Remove it, verify changelog entry
11. Check the public dashboard — verify "since" displays as "Jan 2025" format
