# Mobile Responsive Design

## Goal

Make the app usable on phones and tablets without changing the desktop layout. Desktop is the primary target; phone is the key responsive target; tablet falls in between.

## Breakpoint Strategy

Two Tailwind breakpoints, mobile-first class application:

| Breakpoint | Width  | Target  |
| ---------- | ------ | ------- |
| Default    | <640px | Phone   |
| `sm:`      | 640px  | Tablet  |
| `md:`      | 768px  | Desktop |

Desktop layout is unchanged — all responsive changes use `md:` (and occasionally `sm:`) prefixes.

## Public Dashboard Changes

### Page container

Current: `mx-auto w-full max-w-[960px] px-6 py-8`
New: `mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8`

Tighter padding on mobile (16px horizontal, 24px vertical) expanding to current values at 768px.

### Intro text

Current: `columns-2 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500`
New: `columns-1 gap-12 text-justify text-[13px] leading-[1.7] text-zinc-500 md:columns-2`

Single flowing column on mobile, two columns on desktop.

### Metric cards grid

Current: `grid grid-cols-4 gap-4`
New: `grid grid-cols-2 gap-4 md:grid-cols-4`

2x2 grid on mobile, 4-across on desktop.

## Admin Pages Changes

### Admin page container

Same padding change as public dashboard:
`mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-8`

### Admin nav

Current: `mb-8 flex items-center justify-between`
New: `mb-8 flex flex-wrap items-center justify-between gap-2`

Added `flex-wrap` and `gap-2` so nav links and logout button wrap to a second line on narrow screens instead of overflowing.

### Form rows (vocabulary-editor, supplement-editor)

Current: `mb-4 flex gap-2 border border-zinc-200 p-3 text-[11px]`
New: `mb-4 flex flex-wrap gap-2 border border-zinc-200 p-3 text-[11px]`

Fixed-width inputs (`w-24`, `w-20`, `w-16`, `w-32`) will wrap to new lines on mobile instead of overflowing. The `flex-1` inputs expand to fill available width.

### Tables (readings, vocabulary, supplements)

Wrap tables in a horizontal scroll container:
`<div class="overflow-x-auto">` around each `<table>`.

This preserves the table layout and lets users scroll horizontally on narrow screens.

## Style Spec Update

Add a "Responsive" section to `specs/style.md`:

- Mobile padding: 16px horizontal (`px-4`), 24px vertical (`py-6`)
- Breakpoint at `md:` (768px) restores desktop values
- Columns and grids collapse at `md:` breakpoint

## Scope

- No layout redesign — only responsive adaptation of existing components
- No new components or abstractions
- No JavaScript changes — pure Tailwind class additions
- Desktop appearance is pixel-identical after changes
