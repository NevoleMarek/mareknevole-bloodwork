# Visual Style

## Core concept

The UI looks like a technical document printed on dot-grid paper — the kind you'd find in an engineering notebook. Every component sits on a visible dot grid, uses monospace type, and draws its structure with ASCII box characters.

## Background

- Color: `#f6f5f0` — warm off-white, like aged paper
- Dot grid: `radial-gradient(#a8a89a 1px, transparent 1px)` at `24px × 24px`
- The dot pattern lives on the `<main>` element (CSS `main` selector), not `<body>`. This anchors the grid to the content container so its origin is at `<main>`'s top-left corner. The outer page margins stay plain.
- All layout spacing uses multiples of 24px (`gap-6`, `p-6`, `gap-12`, `py-12`) to snap to the grid
  - 1 grid unit = 24px — use between sibling components at the same level
  - 2 grid units = 48px — use between distinct sections
- All text in block rows uses `leading-6` (24px line height) so row heights are exact grid multiples. Purely inline gaps (number + unit, button clusters) are exempt.

## Typography

- Font: Geist Mono throughout — set globally on `body`, never overridden per-element
- At 16px with `line-height: 1.5`, one text line = 24px = one grid unit
- Labels: `text-[10px] tracking-widest uppercase` — small-caps feel
- Body text: `text-xs` or `text-sm`
- Headings: `text-3xl font-semibold tracking-tight`

## ASCII boxes (the `AsciiBox` component)

Every panel, card, and interactive element is drawn as an ASCII box:

```
+------------------+
|                  |
|   content here   |
|                  |
+------------------+
```

Implementation: CSS `border: 1px solid` for the sides, plus four `+` character spans absolutely positioned at each corner via `translate(-50%, -50%)`. The corner spans use `bg-[#f6f5f0]` to cover the CSS border junction so `+` reads as the actual corner.

All boxes share the same border color (`border-zinc-400`) and background (`bg-[#f6f5f0]` — matching the page, so dots show around boxes but not behind them).

## Color palette

Strictly monochrome. No color is used to encode meaning.

- Text hierarchy: `text-zinc-900` → `text-zinc-700` → `text-zinc-400`
- Borders: `border-zinc-400` (default), `border-zinc-200` (subtle internal dividers)
- Status severity: communicated through bar fill darkness only
  - Normal: `bg-zinc-300`
  - Borderline: `bg-zinc-600`
  - High: `bg-zinc-900`
  - Low: `bg-zinc-400`

## Chart lines

Four grayscale tones with distinct dash patterns so lines are distinguishable without color:

| Series | Color     | Dash pattern |
| ------ | --------- | ------------ |
| 1st    | `#1a1a1a` | solid        |
| 2nd    | `#555555` | `6 3`        |
| 3rd    | `#888888` | `2 3`        |
| 4th    | `#bbbbbb` | `10 4`       |

## Interactive elements

- Buttons: same `AsciiBox` corner pattern applied inline with `position: relative`
- Tabs: plain text underline (`border-b border-zinc-900`) for the active tab — no box
- Period selector: small borderless buttons inside a `border-zinc-200` wrapper
- All hover states use border darkening, never background color change
