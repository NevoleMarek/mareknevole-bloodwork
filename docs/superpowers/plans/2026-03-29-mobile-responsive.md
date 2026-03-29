# Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app usable on phones and tablets by adding Tailwind responsive prefixes — desktop layout stays pixel-identical.

**Architecture:** Mobile-first Tailwind classes with `md:` (768px) breakpoint restoring desktop values. No new components, no JS changes — pure class string edits.

**Tech Stack:** Tailwind CSS v4 responsive prefixes

---

### Task 1: Public dashboard — page container and intro text

**Files:**

- Modify: `app/page.tsx:55` (container classes)
- Modify: `app/page.tsx:61` (intro text classes)

- [ ] **Step 1: Update container padding**

In `app/page.tsx` line 55, change:

```tsx
<main className="mx-auto w-full max-w-[960px] px-6 py-8">
```

to:

```tsx
<main className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8">
```

- [ ] **Step 2: Update intro text columns**

In `app/page.tsx` line 61, change:

```tsx
<div className="mt-8 columns-2 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500">
```

to:

```tsx
<div className="mt-8 columns-1 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500 md:columns-2">
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS — no functional changes, only class strings.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add responsive padding and single-column intro text on mobile"
```

---

### Task 2: Public dashboard — metric cards grid

**Files:**

- Modify: `app/page.tsx:94` (grid classes)

- [ ] **Step 1: Update grid columns**

In `app/page.tsx` line 94, change:

```tsx
<div className="grid grid-cols-4 gap-4">
```

to:

```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: metric cards 2x2 grid on mobile, 4-across on desktop"
```

---

### Task 3: Public dashboard — supplement stack table scroll

**Files:**

- Modify: `components/dashboard/supplement-stack.tsx:29` (wrap table in scroll container)

- [ ] **Step 1: Add overflow-x-auto wrapper around the table**

In `components/dashboard/supplement-stack.tsx`, change the table section (lines 28-48):

```tsx
      <div className="border-t border-zinc-200 p-4">
        <table className="w-full text-[11px]">
```

to:

```tsx
      <div className="border-t border-zinc-200 p-4">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
```

And after the closing `</table>` (line 48), add the closing `</div>`:

```tsx
          </tbody>
        </table>
        </div>
      </div>
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/supplement-stack.tsx
git commit -m "feat: horizontal scroll for supplement stack table on mobile"
```

---

### Task 4: Admin layout — container padding and nav wrapping

**Files:**

- Modify: `app/admin/layout.tsx:29` (container classes)
- Modify: `app/admin/layout.tsx:30` (nav wrapper classes)

- [ ] **Step 1: Update admin container padding**

In `app/admin/layout.tsx` line 29, change:

```tsx
    <main className="mx-auto w-full max-w-[960px] px-6 py-8">
```

to:

```tsx
    <main className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8">
```

- [ ] **Step 2: Update nav wrapper for wrapping**

In `app/admin/layout.tsx` line 30, change:

```tsx
      <div className="mb-8 flex items-center justify-between">
```

to:

```tsx
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: responsive padding and nav wrapping for admin layout"
```

---

### Task 5: Admin forms — flex-wrap for vocabulary and supplement editors

**Files:**

- Modify: `components/admin/vocabulary-editor.tsx:112` (form row classes)
- Modify: `components/admin/supplement-editor.tsx:75` (form row classes)

- [ ] **Step 1: Update vocabulary editor form row**

In `components/admin/vocabulary-editor.tsx` line 112, change:

```tsx
        <div className="mb-4 flex gap-2 border border-zinc-200 p-3 text-[11px]">
```

to:

```tsx
        <div className="mb-4 flex flex-wrap gap-2 border border-zinc-200 p-3 text-[11px]">
```

- [ ] **Step 2: Update supplement editor form row**

In `components/admin/supplement-editor.tsx` line 75, change:

```tsx
        <div className="mb-4 flex gap-2 border border-zinc-200 p-3 text-[11px]">
```

to:

```tsx
        <div className="mb-4 flex flex-wrap gap-2 border border-zinc-200 p-3 text-[11px]">
```

- [ ] **Step 3: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/admin/vocabulary-editor.tsx components/admin/supplement-editor.tsx
git commit -m "feat: flex-wrap admin form rows for mobile"
```

---

### Task 6: Admin tables — horizontal scroll wrappers

**Files:**

- Modify: `components/admin/vocabulary-editor.tsx:71` (wrap table)
- Modify: `components/admin/supplement-editor.tsx:43` (wrap table)
- Modify: `components/admin/readings-table.tsx:17` (wrap table)

- [ ] **Step 1: Wrap vocabulary editor table**

In `components/admin/vocabulary-editor.tsx`, change line 71:

```tsx
      <table className="mb-4 w-full text-[11px]">
```

to:

```tsx
      <div className="overflow-x-auto">
      <table className="mb-4 w-full text-[11px]">
```

And after the closing `</table>` (line 109), add:

```tsx
      </table>
      </div>
```

- [ ] **Step 2: Wrap supplement editor table**

In `components/admin/supplement-editor.tsx`, change line 43:

```tsx
      <table className="mb-4 w-full text-[11px]">
```

to:

```tsx
      <div className="overflow-x-auto">
      <table className="mb-4 w-full text-[11px]">
```

And after the closing `</table>` (line 72), add:

```tsx
      </table>
      </div>
```

- [ ] **Step 3: Wrap readings table**

In `components/admin/readings-table.tsx`, change line 17:

```tsx
    <table className="w-full text-[11px]">
```

to:

```tsx
    <div className="overflow-x-auto">
    <table className="w-full text-[11px]">
```

And after the closing `</table>` (line 45), add:

```tsx
    </table>
    </div>
```

- [ ] **Step 4: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/admin/vocabulary-editor.tsx components/admin/supplement-editor.tsx components/admin/readings-table.tsx
git commit -m "feat: horizontal scroll wrappers for admin tables on mobile"
```

---

### Task 7: Update style spec

**Files:**

- Modify: `specs/style.md` (add Responsive section)

- [ ] **Step 1: Add Responsive section to style spec**

Append after the "Borders" section at the end of `specs/style.md`:

```markdown
## Responsive

- Breakpoint: `md:` (768px) — below this is mobile, above is desktop
- Mobile padding: 16px horizontal (`px-4`), 24px vertical (`py-6`)
- Desktop padding: 24px horizontal (`px-6`), 32px vertical (`py-8`)
- Intro text: single column on mobile (`columns-1`), two on desktop (`md:columns-2`)
- Metric cards: 2-column grid on mobile (`grid-cols-2`), 4-column on desktop (`md:grid-cols-4`)
- Tables: `overflow-x-auto` wrapper for horizontal scroll on mobile
- Admin forms: `flex-wrap` so fixed-width inputs wrap on narrow screens
```

- [ ] **Step 2: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add specs/style.md
git commit -m "docs: add responsive section to style spec"
```
