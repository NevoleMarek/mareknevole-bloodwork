# Visual Style

## Core concept

Bloodwork is a calm, health-oriented data product. The interface should feel
precise without feeling clinical: generous whitespace, clear hierarchy, warm
neutral surfaces, and a restrained evergreen accent. Data remains the focus.
Decoration never competes with a measurement.

The public dashboard and admin workspace share one visual language. Public
pages are editorial and spacious; admin pages are denser, but use the same
type, color, controls, radii, and focus treatment.

## Background and materials

- Page background: pale green-neutral `#f3f7f5`, with static low-contrast
  radial washes.
- Primary surface: white `#ffffff`.
- Muted surface: `#f8faf9`.
- Floating navigation: translucent warm white with `20px` blur and restrained
  saturation.
- Use translucency only for floating navigation or hierarchy. Data cards,
  charts, tables, and forms remain solid for legibility.
- `prefers-reduced-transparency` replaces glass with a solid white surface.
- `prefers-contrast: more` strengthens borders and muted text.

## Typography

- Primary font: the platform system stack, beginning with `-apple-system` and
  `BlinkMacSystemFont`.
- Monospace is reserved for stable identifiers and machine-oriented values,
  using Geist Mono through `font-mono`.
- Display title: responsive `2.8rem–5.8rem`, `0.94` line height, `-0.065em`
  tracking.
- Page title: responsive `1.75rem–2.5rem`, `1.05` line height, `-0.04em`
  tracking.
- Section title: responsive `1.5rem–2rem`, `1.05` line height, `-0.035em`
  tracking.
- Body: `0.875rem–1.125rem` with `1.55–1.75` line height.
- Eyebrow: `0.6875rem`, bold, uppercase, `0.13em` tracking.
- Small controls never fall below `0.75rem`; primary touch targets remain at
  least `44px` tall.
- Use tabular figures for measurements, dates, ranges, and counts.

## Color palette

| Role          | Value                    |
| ------------- | ------------------------ |
| Primary text  | `#17231f`                |
| Muted text    | `#63706b`                |
| Subtle text   | `#85908c`                |
| Accent        | `#14775f`                |
| Accent strong | `#0e604d`                |
| Accent soft   | `#e3f3ed`                |
| Hairline      | `rgba(23, 35, 31, 0.10)` |
| Strong border | `rgba(23, 35, 31, 0.18)` |
| Destructive   | `#b84a4a`                |

### Status colors

Status is always communicated with text as well as color.

| Status     | Treatment |
| ---------- | --------- |
| In range   | Emerald   |
| Borderline | Amber     |
| High       | Rose      |
| Low        | Sky blue  |

Reference ranges use a low-opacity emerald track. The current-value marker
uses the relevant status color.

## Spacing and layout

- Base spacing unit: `4px`.
- Public content width: `1180px`.
- Admin content width: `1216px`.
- Mobile outer gutter: `16px` public, `12px` admin.
- Desktop outer gutter: `24–32px`.
- Section spacing: `64px` mobile, `80px` desktop.
- Card gap: `12px` mobile, `16px` desktop.
- Card padding: `16–20px`; feature and admin panels may use `24px`.
- Public hero uses a split layout at desktop and stacks naturally on mobile.

## Shape, borders, and depth

- Data cards and panels use `24px` radii.
- Compact glass navigation uses `18–20px` radii.
- Inputs use `11–13px` radii.
- Buttons and segmented controls are pill-shaped.
- Default borders are one-pixel hairlines using the line tokens.
- Data surfaces use only a one-pixel grounding shadow.
- Elevated hero and floating navigation may use a broad, low-opacity shadow.
- Avoid stacked translucent surfaces.

## Controls and interaction

- Buttons and button-styled anchors respond on pointer-down with a
  transform-only `scale(0.98)` over `160ms`, then release over `100ms`.
- Color and border responses use the strong ease-out curve
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- Card lift is limited to fine-pointer hover and moves no more than `2px`.
- Hover-dependent behavior is gated with
  `(hover: hover) and (pointer: fine)`.
- Keyboard focus uses a visible three-pixel evergreen ring with offset.
- Selected controls expose semantic state with `aria-pressed` or
  `aria-current`, not color alone.
- Destructive actions remain visible and use explicit labels.

## Motion

- Authored motion uses shared `80ms`, `100ms`, `160ms`, and `180ms` duration
  tokens for feedback, release, controls, and state transitions.
- Medical charts and trend lines never animate.
- Sticky navigation keeps stable geometry; no padding, width, margin, or
  layout transitions.
- The section underline uses a `160ms` transform from `origin-left` with the
  strong ease-out curve.
- Admin state shells and editing panels enter over `160–180ms` with a
  four-pixel offset and `0.99` scale. Health import states enter from
  `scale(0.97)` with `@starting-style` and retain an interruptible,
  transition-based exit inside a fixed-height crossfade. Copy confirmation
  labels travel only three pixels.
- File drop targets respond to active drags only on fine pointers. Coarse
  pointers and reduced-motion mode use an `80ms` glyph-opacity cue instead.
- Appended extraction rows enter over `160ms` from a four-pixel offset;
  reduced motion keeps only the `80ms` opacity cue.
- Section navigation scrolls immediately in every motion mode so this
  repeatedly used control never delays access to data.
- Reduced-motion mode keeps short color, opacity, and focus feedback but
  removes transform movement.
- Avoid looping, decorative, or full-viewport motion.

## Responsive behavior

- Design and test at `320px`, `390px`, and desktop widths.
- Featured metric cards use one column at the narrowest width, two above
  `370px`, and four on desktop.
- Public biomarker and supplement tables become semantic card rows below
  `640px`; they do not require horizontal page scrolling.
- Admin data tables retain contained horizontal scrolling because their
  editing semantics need complete columns. Their scroll regions never expand
  the document width.
- Public and admin navigation are compact, horizontally scrollable regions on
  narrow screens with hidden scrollbars.
- Admin forms stack into one column on mobile and use two or more columns only
  when space permits.
- Charts use at least `170px` plot height and allow Recharts to reduce tick
  density with `minTickGap`.

## Accessibility

- Every route includes a skip link to the main content.
- Clickable metric cards and biomarker rows are keyboard operable and expose
  selection state.
- Tables use captions and semantic column headers.
- Inputs, checkboxes, icon buttons, and file controls have programmatic labels.
- File drop zones retain a focusable native file input.
- Loading, success, and error states use status or alert semantics.
- Charts provide concise accessible summaries in addition to visual tooltips.
- Status never relies on a colored dot alone.
