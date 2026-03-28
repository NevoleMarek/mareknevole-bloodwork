# Visual Style

## Core concept

Typography-driven design built on Geist Mono. Structure comes from whitespace and type hierarchy — no dot grid, no ASCII box corners, no decorative elements.

## Background

- Page background: `bg-stone-50` (`#fafaf9`)
- Card background: `bg-white`

## Typography

- Font: Geist Mono exclusively — set globally on `body`, never overridden per-element
- Title: `text-2xl font-semibold tracking-tight`
- Subtitle: `text-[10px] uppercase tracking-widest`
- Section labels: `text-[9px] tracking-[2px]`
- Metric values: `text-3xl font-bold`
- Units: `text-xs` with muted color
- Body text: `text-xs` or `text-sm`

## Color palette

- Primary text: `text-zinc-900`
- Muted text: `text-zinc-500`
- Subtle text: `text-zinc-400`
- Borders: `border-zinc-200`
- Track fill: `bg-zinc-100`

### Status colors

Desaturated at 30% opacity, used for range bar zones only:

| Zone       | Color                |
| ---------- | -------------------- |
| Normal     | green at 30% opacity |
| Borderline | amber at 30% opacity |
| High / Low | red at 30% opacity   |
| Reference  | blue at 30% opacity  |

## Spacing

- Base unit: 4px
- Card padding / gap: 16px
- Section gap: 32px
- Page padding: 24px
- Max width: 960px

## Borders

- Thin uniform `border-zinc-200`
- No rounded corners
- No shadows
