# Dashboard Layout Redesign

## Overview

Redesign the public dashboard to separate supplements and changelog from the accordion, add a sticky section nav with smooth scroll-to, and paginate the changelog.

## Page Layout

New section order (top to bottom):

1. **Header** — "BLOODWORK" title, "Marek Nevole" subtitle, two-column intro text
2. **Inline nav buttons** — Metrics, Trends, Supplements, Changelog — sits below the intro text inside the header
3. **Metrics** — grid of metric cards (unchanged)
4. **Trends** — trend chart (unchanged)
5. **Supplements** — always-visible table, no accordion
6. **Changelog** — grouped by day, paginated with "Load more"

## Sticky Nav Behavior

When the user scrolls past the inline nav buttons:

1. A wrapper `div` reserves the nav's height in the document flow (prevents content jump)
2. The nav bar becomes `position: fixed; top: 0` with background and bottom border
3. The "BLOODWORK / Marek Nevole" logo smoothly expands in from the left, pushing buttons right
4. When scrolling back up past the threshold, the logo collapses and the nav returns to inline position

### Animation Details

- Logo width: `0` → `120px` over 500ms with `cubic-bezier(0.25, 0.1, 0.25, 1)`
- Logo opacity: `0` → `1` over 400ms with 150ms delay (space opens before text appears)
- Logo margin-right: `0` → `24px` over 500ms (same curve as width)
- All transitions are CSS-only, no JS animation

### Active Section Indicator

A scroll listener tracks which section is currently in view (using section element positions relative to viewport). The corresponding nav button gets:

- Text color: `text-zinc-900` (from `text-zinc-400`)
- Underline: 1px bottom border that scales in via `transform: scaleX(0)` → `scaleX(1)` over 300ms

## Components

### Delete: `components/dashboard/supplement-stack.tsx`

The accordion wrapper is removed entirely.

### New: `components/dashboard/section-nav.tsx`

Client component. Contains:

- The nav buttons (Metrics, Trends, Supplements, Changelog)
- The compact logo (hidden when inline, visible when stuck)
- Sticky behavior via IntersectionObserver on a wrapper element
- Scroll-spy for active section via scroll event listener
- Smooth scroll on button click with offset for the sticky nav height

Props: none (section IDs are hardcoded since the page layout is fixed).

### New: `components/dashboard/supplement-table.tsx`

Server component. Simple table displaying active supplements — same markup as the current `SupplementStack` table but without the accordion wrapper or changelog.

Props:

```typescript
{
  supplements: Supplement[];
}
```

### New: `components/dashboard/changelog-list.tsx`

Client component. Displays changelog entries grouped by day (date on first entry of each group, indented for rest). Shows 20 entries initially, "Load more" button appends next 20.

Props:

```typescript
{
  changelog: SupplementChangelog[];
}
```

Client-side pagination — all entries passed in, component manages visible count with state.

### Modify: `app/page.tsx`

- Remove `SupplementStack` import
- Add `SectionNav`, `SupplementTable`, `ChangelogList` imports
- Move inline nav into the header section
- Reorder sections: Metrics → Trends → Supplements → Changelog
- Add `id` attributes to each section for scroll targeting
- Remove accordion-related data (e.g., `lastUpdated` calculation)

### Modify: `components/ui/accordion.tsx`

Keep the file — it may be used elsewhere. Only remove the import from `supplement-stack.tsx`.

## Mobile Behavior

On mobile (below `md:` breakpoint):

- Inline nav buttons wrap if needed (flex-wrap)
- Sticky nav works the same way
- Logo in sticky nav may need smaller width or be hidden on very narrow screens
